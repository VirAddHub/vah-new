/**
 * Internal Mail Import Route
 * 
 * Internal endpoint for the OneDrive mail ingestion worker.
 * Creates mail items from OneDrive files.
 * 
 * Route: POST /api/internal/mail/from-onedrive
 * 
 * Authentication: x-mail-import-secret header must match MAIL_IMPORT_WEBHOOK_SECRET
 * 
 * Payload:
 * {
 *   userId: number,
 *   sourceSlug: string,
 *   fileName: string,
 *   oneDriveFileId?: string,
 *   oneDriveDownloadUrl?: string,
 *   createdAt?: string
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   data: { mailId: number }
 * }
 */

import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db';
import { nowMs } from '../../lib/time';
import { notifyOpsMailCreated } from '../../services/postmarkNotifications';
import { sendMailScanned } from '../../lib/mailer';
import { isUserEntitled } from '../services/entitlement';

const router = Router();

// Payload validation schema
const MailImportPayload = z.object({
  userId: z.number().int().positive(),
  sourceSlug: z.string().min(1),
  fileName: z.string().min(1),
  oneDriveFileId: z.string().optional(),
  oneDriveDownloadUrl: z.string().url().optional().nullable(),
  createdAt: z.string().optional(),
});

// Convert tag slug to human-readable title
const tagToTitle = (tagSlug: string): string => {
  const titleMap: Record<string, string> = {
    hmrc: 'HMRC',
    companies_house: 'Companies House',
    companieshouse: 'Companies House',
    bank: 'Bank Statement',
    insurance: 'Insurance',
    utilities: 'Utilities',
    other: 'General Mail',
  };
  return titleMap[tagSlug] || tagSlug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatUkDateShort = (d: Date): string => {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const tryParseDateFromFilename = (fileName: string): Date | null => {
  // common patterns:
  // - user4_2-2-2025_HMRC.pdf
  // - user4_02-02-2025_hmrc.pdf
  // - 2025-02-02_xxx.pdf
  const base = String(fileName || '').replace(/\.[^/.]+$/, '');

  // dd-mm-yyyy (or dd_mm_yyyy)
  {
    const m = base.match(/\b(\d{1,2})[-_](\d{1,2})[-_](\d{2,4})\b/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
      const d = new Date(Date.UTC(yyyy, mm - 1, dd));
      if (!Number.isNaN(d.getTime()) && d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd) {
        return d;
      }
    }
  }

  // yyyy-mm-dd
  {
    const m = base.match(/\b(\d{4})[-_](\d{1,2})[-_](\d{1,2})\b/);
    if (m) {
      const yyyy = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      const d = new Date(Date.UTC(yyyy, mm - 1, dd));
      if (!Number.isNaN(d.getTime()) && d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd) {
        return d;
      }
    }
  }

  return null;
};

router.post('/from-onedrive', async (req, res) => {
  try {
    // Check secret header
    const secret = req.headers['x-mail-import-secret'];
    const expectedSecret = process.env.MAIL_IMPORT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('[internalMailImport] MAIL_IMPORT_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        ok: false,
        error: 'server_configuration_error',
        message: 'Mail import webhook secret not configured',
      });
    }

    if (!secret || secret !== expectedSecret) {
      console.warn('[internalMailImport] Invalid or missing secret header');
      return res.status(401).json({
        ok: false,
        error: 'unauthorized',
        message: 'Invalid or missing x-mail-import-secret header',
      });
    }

    // Validate payload
    let payload: z.infer<typeof MailImportPayload>;
    try {
      payload = MailImportPayload.parse(req.body);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'validation_error',
          message: 'Invalid payload',
          issues: e.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      return res.status(400).json({
        ok: false,
        error: 'invalid_payload',
        message: 'Failed to parse payload',
      });
    }

    const pool = getPool();

    // Log the incoming payload for audit trail
    console.log('[internalMailImport] Processing mail import:', {
      fileName: payload.fileName,
      parsedUserId: payload.userId,
      sourceSlug: payload.sourceSlug,
      oneDriveFileId: payload.oneDriveFileId,
    });

    // Verify user exists
    const { rows: userRows } = await pool.query(
      'SELECT id, email, first_name, last_name, plan_status, kyc_status, status FROM "user" WHERE id = $1',
      [payload.userId]
    );

    if (userRows.length === 0) {
      console.error('[internalMailImport] ❌ User not found:', {
        fileName: payload.fileName,
        requestedUserId: payload.userId,
      });
      return res.status(404).json({
        ok: false,
        error: 'user_not_found',
        message: `User ${payload.userId} does not exist`,
        fileName: payload.fileName,
      });
    }

    const user = userRows[0];
    const userSnapshot = {
      id: user.id,
      email: user.email,
      plan_status: user.plan_status,
      kyc_status: user.kyc_status,
      status: user.status,
    };

    // Log user details for verification
    console.log('[internalMailImport] User verified:', {
      userId: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      fileName: payload.fileName,
      planStatus: user.plan_status,
      kycStatus: user.kyc_status,
      userStatus: user.status,
    });

    // Check user eligibility - determine if mail item should be locked
    // Use entitlement service (subscription.status === 'active') as source of truth
    const entitlement = await isUserEntitled(payload.userId);
    const isUserActive = !user.status || user.status === 'active';
    const isKycApproved =
      user.kyc_status === 'approved' ||
      user.kyc_status === 'verified'; // legacy status label

    // Determine if mail item should be locked
    // Lock if: not entitled (subscription not active) OR user inactive OR KYC not approved
    const locked = !entitlement.entitled || !isUserActive || !isKycApproved;
    let lockedReason: string | null = null;

    if (locked) {
      if (!entitlement.entitled) {
        lockedReason = 'plan_inactive'; // Subscription not active (source of truth)
        console.warn('[internalMailImport] user_not_entitled - creating locked mail item', {
          fileName: payload.fileName,
          parsedUserId: payload.userId,
          subscriptionStatus: entitlement.subscriptionStatus,
          reason: entitlement.reason,
          userSnapshot,
        });
      } else if (!isUserActive) {
        lockedReason = 'user_inactive';
        console.warn('[internalMailImport] user_status_not_active - creating locked mail item', {
          fileName: payload.fileName,
          parsedUserId: payload.userId,
          userSnapshot,
        });
      } else if (!isKycApproved) {
        lockedReason = 'kyc_not_approved';
        console.warn('[internalMailImport] user_kyc_not_approved - creating locked mail item', {
          fileName: payload.fileName,
          parsedUserId: payload.userId,
          userSnapshot,
        });
      }
    }
    const now = nowMs();

    // Parse created date from payload or use current time
    let receivedAtMs: number;
    if (payload.createdAt) {
      const date = new Date(payload.createdAt);
      receivedAtMs = isNaN(date.getTime()) ? now : date.getTime();
    } else {
      receivedAtMs = now;
    }

    // IDEMPOTENCY CHECK: Check if this file has already been imported for this user
    // We check by userId + fileName (via notes pattern) or userId + scan_file_url
    let existingMailItem: any = null;

    if (payload.oneDriveDownloadUrl) {
      // Check by scan_file_url (most reliable, unique per file)
      const urlCheck = await pool.query(
        'SELECT id, subject, tag, status FROM mail_item WHERE user_id = $1 AND scan_file_url = $2 LIMIT 1',
        [payload.userId, payload.oneDriveDownloadUrl]
      );
      if (urlCheck.rows.length > 0) {
        existingMailItem = urlCheck.rows[0];
      }
    }

    // If not found by URL, check by fileName in notes (fallback)
    if (!existingMailItem) {
      const notesPattern = `OneDrive import: ${payload.fileName}`;
      const notesCheck = await pool.query(
        'SELECT id, subject, tag, status FROM mail_item WHERE user_id = $1 AND notes = $2 LIMIT 1',
        [payload.userId, notesPattern]
      );
      if (notesCheck.rows.length > 0) {
        existingMailItem = notesCheck.rows[0];
      }
    }

    // If duplicate found, skip creation and emails
    if (existingMailItem) {
      console.log('[internalMailImport] Duplicate detected, no-op', {
        userId: payload.userId,
        fileName: payload.fileName,
        existingMailId: existingMailItem.id,
        oneDriveFileId: payload.oneDriveFileId,
        scanFileUrl: payload.oneDriveDownloadUrl,
      });

      return res.status(200).json({
        ok: true,
        skipped: true,
        data: {
          mailId: existingMailItem.id,
          reason: 'duplicate_file_for_user',
        },
      });
    }

    // Generate idempotency key from OneDrive file ID or filename
    const idempotencyKey = payload.oneDriveFileId
      ? `onedrive_import_${payload.oneDriveFileId}`
      : `onedrive_import_${payload.fileName}_${receivedAtMs}`;

    const tagTitle = tagToTitle(payload.sourceSlug);
    const dateFromName = tryParseDateFromFilename(payload.fileName);
    const dateForSubject = dateFromName || new Date(receivedAtMs);
    const subject = `${tagTitle} letter — ${formatUkDateShort(dateForSubject)}`;
    const senderName = tagTitle;

    // Insert mail item with scan_file_url initially null
    // The worker will move the file to processed folder and update this URL with the final location
    // Always create the mail item, but mark it as locked if user/plan/kyc is inactive
    const result = await pool.query(
      `INSERT INTO mail_item (
        idempotency_key, user_id, subject, sender_name, received_date,
        scan_file_url, file_size, scanned, status, tag, notes,
        received_at_ms, created_at, updated_at, locked, locked_reason, admin_note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (idempotency_key) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        subject = EXCLUDED.subject,
        sender_name = EXCLUDED.sender_name,
        received_date = EXCLUDED.received_date,
        scan_file_url = EXCLUDED.scan_file_url,
        file_size = EXCLUDED.file_size,
        scanned = EXCLUDED.scanned,
        status = EXCLUDED.status,
        tag = EXCLUDED.tag,
        notes = EXCLUDED.notes,
        received_at_ms = EXCLUDED.received_at_ms,
        updated_at = EXCLUDED.updated_at,
        locked = EXCLUDED.locked,
        locked_reason = EXCLUDED.locked_reason,
        admin_note = EXCLUDED.admin_note
      RETURNING id, subject, status, tag, locked, locked_reason`,
      [
        idempotencyKey,                    // $1: idempotency_key
        payload.userId,                     // $2: user_id
        subject,                            // $3: subject
        senderName,                         // $4: sender_name
        new Date(receivedAtMs).toISOString().split('T')[0], // $5: received_date
        null,                               // $6: scan_file_url - set to null initially, will be updated after file move
        0,                                  // $7: file_size (not provided in payload)
        true,                               // $8: scanned (true for OneDrive files)
        'received',                         // $9: status
        payload.sourceSlug,                 // $10: tag
        `OneDrive import: ${payload.fileName}`, // $11: notes
        receivedAtMs,                       // $12: received_at_ms
        now,                                // $13: created_at
        now,                                // $14: updated_at
        locked,                             // $15: locked
        lockedReason,                       // $16: locked_reason
        locked ? `Ingested while ${lockedReason}` : null, // $17: admin_note
      ]
    );

    const mailItem = result.rows[0];

    const isLocked = mailItem.locked === true;
    console.log('[internalMailImport] Successfully created NEW mail item:', {
      mailId: mailItem.id,
      userId: payload.userId,
      subject: mailItem.subject,
      tag: mailItem.tag,
      fileName: payload.fileName,
      oneDriveFileId: payload.oneDriveFileId,
      locked: isLocked,
      lockedReason: mailItem.locked_reason,
    });

    // VERIFY mail item exists in database before sending emails
    const verifyResult = await pool.query(
      'SELECT id, user_id, subject, tag, status FROM mail_item WHERE id = $1',
      [mailItem.id]
    );

    if (verifyResult.rows.length === 0) {
      console.error('[internalMailImport] CRITICAL: Mail item not found in DB after insert! MailId:', mailItem.id);
      return res.status(500).json({
        ok: false,
        error: 'verification_failed',
        message: 'Mail item was not found in database after creation',
      });
    }

    const verifiedMailItem = verifyResult.rows[0];
    const verifiedUserId = Number(verifiedMailItem.user_id);

    // CRITICAL VERIFICATION: Ensure the userId in the database matches what we intended
    if (Number.isNaN(verifiedUserId) || verifiedUserId !== payload.userId) {
      console.error('[internalMailImport] ❌ CRITICAL: userId mismatch!', {
        fileName: payload.fileName,
        intendedUserId: payload.userId,
        actualUserIdInDB: verifiedMailItem.user_id,
        mailId: verifiedMailItem.id,
      });
      return res.status(500).json({
        ok: false,
        error: 'user_id_mismatch',
        message: `Mail item was created for wrong user. Intended: ${payload.userId}, Actual: ${verifiedMailItem.user_id}`,
        fileName: payload.fileName,
        intendedUserId: payload.userId,
        actualUserId: verifiedMailItem.user_id,
      });
    }

    // CRITICAL VERIFICATION: Re-fetch user to ensure we have the latest data
    const { rows: userVerifyRows } = await pool.query(
      'SELECT id, email, first_name, last_name FROM "user" WHERE id = $1',
      [verifiedUserId]
    );

    if (userVerifyRows.length === 0) {
      console.error('[internalMailImport] ❌ CRITICAL: User not found for email!', {
        fileName: payload.fileName,
        mailId: verifiedMailItem.id,
        userId: verifiedUserId,
      });
      return res.status(500).json({
        ok: false,
        error: 'user_not_found_for_email',
        message: `User ${verifiedMailItem.user_id} not found when preparing email`,
        fileName: payload.fileName,
      });
    }

    const userForEmail = userVerifyRows[0];

    if (userForEmail.email !== user.email) {
      console.error('[internalMailImport] ❌ CRITICAL: Email mismatch!', {
        fileName: payload.fileName,
        mailId: verifiedMailItem.id,
        userId: verifiedUserId,
        expectedEmail: user.email,
        actualEmail: userForEmail.email,
      });
      return res.status(500).json({
        ok: false,
        error: 'email_mismatch',
        message: `Email address mismatch. Expected: ${user.email}, Found: ${userForEmail.email}`,
        fileName: payload.fileName,
      });
    }

    console.log('[internalMailImport] ✅ Verified mail item exists in DB with correct user:', {
      mailId: verifiedMailItem.id,
      userId: verifiedUserId,
      userEmail: userForEmail.email,
      subject: verifiedMailItem.subject,
      tag: verifiedMailItem.tag,
      fileName: payload.fileName,
    });

    // Send email notification to user about new mail (like old Zapier webhook)
    // Email is ONLY sent if:
    // 1. Mail item is confirmed in database
    // 2. userId in database matches intended userId
    // 3. Email address matches the user in database
    // 4. Mail item is NOT locked (user has active plan/status/kyc)
    // This ensures 100% confidence that email = correct user = correct dashboard
    if (!isLocked) {
      try {
        await sendMailScanned({
          email: userForEmail.email, // Use verified email from database
          firstName: userForEmail.first_name || "there",
          subject: `New mail received - ${tagTitle}`,
          cta_url: `${process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app'}/dashboard`
        });
        console.log('[internalMailImport] ✅ Email notification sent to user:', {
          email: userForEmail.email,
          userId: verifiedMailItem.user_id,
          mailId: verifiedMailItem.id,
          fileName: payload.fileName,
          confirmation: 'Mail item is confirmed in database for this user',
        });
      } catch (emailError) {
        console.error('[internalMailImport] ❌ Failed to send email notification to user:', {
          email: userForEmail.email,
          userId: verifiedMailItem.user_id,
          mailId: verifiedMailItem.id,
          fileName: payload.fileName,
          error: emailError,
        });
        // Don't fail the webhook if email fails, but log it clearly
      }
    } else {
      console.log('[internalMailImport] ⚠️ Skipping email notification - mail item is locked', {
        mailId: verifiedMailItem.id,
        userId: verifiedMailItem.user_id,
        lockedReason: mailItem.locked_reason,
        fileName: payload.fileName,
      });
    }

    // Send ops notification AFTER successful DB insert and verification
    // This email is sent to support@virtualaddresshub.co.uk (not the user)
    // Includes filename and userId for audit trail
    try {
      await notifyOpsMailCreated({
        mailId: verifiedMailItem.id,
        userId: verifiedMailItem.user_id, // Use verified userId from database
        subject: verifiedMailItem.subject,
        tag: verifiedMailItem.tag,
        fileName: payload.fileName, // Include filename for ops to verify
        userEmail: userForEmail.email, // Include user email for ops verification
      });
      console.log('[internalMailImport] ✅ Ops notification sent:', {
        mailId: verifiedMailItem.id,
        userId: verifiedMailItem.user_id,
        userEmail: userForEmail.email,
        fileName: payload.fileName,
      });
    } catch (opsEmailError) {
      console.error('[internalMailImport] ❌ Failed to send ops notification:', {
        mailId: verifiedMailItem.id,
        userId: verifiedMailItem.user_id,
        error: opsEmailError,
      });
      // Don't fail the webhook if ops email fails
    }

    // Return success response
    return res.status(200).json({
      ok: true,
      created: true,
      data: {
        mailId: mailItem.id,
      },
      locked: isLocked,
      lockedReason: mailItem.locked_reason || null,
    });
  } catch (error: any) {
    console.error('[internalMailImport] Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

/**
 * Update scan_file_url for a mail item after file has been moved
 * Route: PATCH /api/internal/mail/from-onedrive/:mailId/scan-url
 */
router.patch('/from-onedrive/:mailId/scan-url', async (req, res) => {
  try {
    // Check secret header
    const secret = req.headers['x-mail-import-secret'];
    const expectedSecret = process.env.MAIL_IMPORT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('[internalMailImport] MAIL_IMPORT_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        ok: false,
        error: 'server_configuration_error',
        message: 'Mail import webhook secret not configured',
      });
    }

    if (!secret || secret !== expectedSecret) {
      console.warn('[internalMailImport] Invalid or missing secret header');
      return res.status(401).json({
        ok: false,
        error: 'unauthorized',
        message: 'Invalid or missing x-mail-import-secret header',
      });
    }

    const mailId = parseInt(req.params.mailId, 10);
    if (isNaN(mailId)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_mail_id',
        message: 'Invalid mail ID',
      });
    }

    const { scanFileUrl } = req.body;
    if (!scanFileUrl || typeof scanFileUrl !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'scanFileUrl is required and must be a string',
      });
    }

    const pool = getPool();

    // Update the mail item's scan_file_url
    const updateResult = await pool.query(
      'UPDATE mail_item SET scan_file_url = $1, updated_at = $2 WHERE id = $3 RETURNING id, scan_file_url',
      [scanFileUrl, nowMs(), mailId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'mail_item_not_found',
        message: `Mail item ${mailId} not found`,
      });
    }

    console.log('[internalMailImport] Updated scan_file_url for mail item', {
      mailId,
      scanFileUrl,
    });

    return res.status(200).json({
      ok: true,
      data: {
        mailId: updateResult.rows[0].id,
        scanFileUrl: updateResult.rows[0].scan_file_url,
      },
    });
  } catch (error: any) {
    console.error('[internalMailImport] Error updating scan_file_url:', error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

export default router;

