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
 *   createdAt?: string,
 *   sender?: string | null,
 *   mailType?: string | null
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   data: { mailId: number }
 * }
 */

import { Router } from 'express';
import { logger } from '../../lib/logger';
import { z } from 'zod';
import { getPool } from '../db';
import { nowMs } from '../../lib/time';
import { notifyOpsMailCreated } from '../../services/postmarkNotifications';
import { sendMailScanned, sendMailWaiting } from '../../lib/mailer';
import { getAccess } from '../services/access';
import { isUserEntitled } from '../services/entitlement';
import crypto from 'crypto';
import { recordImporterReport } from '../../services/mailImportStatus';
import { parseMailFilename } from '../../services/mailFilenameParser';
import { letterDetailsFromType } from '../../services/mailLetterDetails';

const router = Router();

/**
 * Compare two strings in constant time to prevent timing-oracle attacks.
 * Returns false if either argument is falsy.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false; // Buffer lengths differ — still no match
  }
}

// Payload validation schema
const MailImportPayload = z.object({
  userId: z.number().int().positive(),
  sourceSlug: z.string().min(1),
  fileName: z.string().min(1),
  oneDriveFileId: z.string().optional(),
  oneDriveDownloadUrl: z.string().url().optional().nullable(),
  createdAt: z.string().optional(),
});

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
  // Declare payload outside try block so it's accessible in catch block
  let payload: z.infer<typeof MailImportPayload> | undefined;
  
  try {
    // Check secret header
    const secret = req.headers['x-mail-import-secret'];
    const expectedSecret = process.env.MAIL_IMPORT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      logger.error('[internalMailImport] MAIL_IMPORT_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        ok: false,
        error: 'server_configuration_error',
        message: 'Mail import webhook secret not configured',
      });
    }

    if (!secret || !timingSafeStringEqual(String(secret), expectedSecret)) {
      logger.warn('[internalMailImport] Invalid or missing secret header');
      return res.status(401).json({
        ok: false,
        error: 'unauthorized',
        message: 'Invalid or missing x-mail-import-secret header',
      });
    }

    // Validate payload
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
    logger.info('[internalMailImport] Processing mail import:', {
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
      logger.error('[internalMailImport] ❌ User not found:', {
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
    logger.info('[internalMailImport] User verified:', {
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
    // User is active only if status is explicitly 'active' (not pending_payment, suspended, etc.)
    const isUserActive = user.status === 'active';
    // Also check plan_status - if pending_payment, user should not receive mail
    const isPlanActive = user.plan_status === 'active';
    const isKycApproved =
      user.kyc_status === 'approved' ||
      user.kyc_status === 'verified'; // legacy status label

    // Determine if mail item should be locked
    // Lock if: not entitled (subscription not active) OR user inactive OR plan not active OR KYC not approved
    // The single access decision decides whether this customer may see their mail (services/access.ts).
    // The reasons below are kept only to label the stored item for staff.
    const accessDecision = await getAccess(Number(payload.userId));
    const locked = !accessDecision || accessDecision.level !== 'full';
    let lockedReason: string | null = null;

    if (locked) {
      if (!entitlement.entitled) {
        lockedReason = 'plan_inactive'; // Subscription not active (source of truth)
        logger.warn('[internalMailImport] user_not_entitled - creating locked mail item', {
          fileName: payload.fileName,
          parsedUserId: payload.userId,
          subscriptionStatus: entitlement.subscriptionStatus,
          reason: entitlement.reason,
          userSnapshot,
        });
      } else if (!isUserActive) {
        lockedReason = 'user_inactive';
        logger.warn('[internalMailImport] user_status_not_active - creating locked mail item', {
          fileName: payload.fileName,
          parsedUserId: payload.userId,
          userStatus: user.status,
          userSnapshot,
        });
      } else if (!isPlanActive) {
        lockedReason = 'plan_pending_payment';
        logger.warn('[internalMailImport] plan_status_not_active - creating locked mail item', {
          fileName: payload.fileName,
          parsedUserId: payload.userId,
          planStatus: user.plan_status,
          userSnapshot,
        });
      } else if (!isKycApproved) {
        lockedReason = 'kyc_not_approved';
        logger.warn('[internalMailImport] user_kyc_not_approved - creating locked mail item', {
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

    // Exact match first: this very OneDrive file (same file id), for any customer
    if (payload.oneDriveFileId) {
      const fileCheck = await pool.query(
        'SELECT id, user_id, subject, tag, status, scan_file_url, idempotency_key FROM mail_item WHERE idempotency_key = ANY($1::text[]) ORDER BY id LIMIT 1',
        [[`onedrive_import_${payload.oneDriveFileId}`, `onedrive_${payload.oneDriveFileId}`]]
      );
      if (fileCheck.rows.length > 0) {
        const row = fileCheck.rows[0];
        if (Number(row.user_id) !== Number(payload.userId)) {
          // Never move a letter to another customer because a file was renamed
          return res.status(409).json({
            ok: false,
            error: 'file_already_imported_for_other_customer',
            message: `This file was already added to customer #${row.user_id}'s account.`,
            fileName: payload.fileName,
            mailId: row.id,
          });
        }
        existingMailItem = { ...row, matchedBy: 'link' };
      }
    }

    if (!existingMailItem && payload.oneDriveDownloadUrl) {
      // Check by scan_file_url (most reliable, unique per file)
      const urlCheck = await pool.query(
        'SELECT id, subject, tag, status, scan_file_url, idempotency_key FROM mail_item WHERE user_id = $1 AND scan_file_url = $2 LIMIT 1',
        [payload.userId, payload.oneDriveDownloadUrl]
      );
      if (urlCheck.rows.length > 0) {
        existingMailItem = { ...urlCheck.rows[0], matchedBy: 'link' };
      }
    }

    // If not found by URL, check by fileName in notes (fallback)
    if (!existingMailItem) {
      const notesPattern = `OneDrive import: ${payload.fileName}`;
      const notesCheck = await pool.query(
        'SELECT id, subject, tag, status, scan_file_url, idempotency_key FROM mail_item WHERE user_id = $1 AND notes = $2 LIMIT 1',
        [payload.userId, notesPattern]
      );
      if (notesCheck.rows.length > 0) {
        existingMailItem = { ...notesCheck.rows[0], matchedBy: 'name' };
      }
    }

    // If duplicate found, skip creation and emails
    if (existingMailItem) {
      logger.info('[internalMailImport] Duplicate detected, no-op', {
        userId: payload.userId,
        fileName: payload.fileName,
        existingMailId: existingMailItem.id,
        oneDriveFileId: payload.oneDriveFileId,
        scanFileUrl: payload.oneDriveDownloadUrl,
      });

      // Same file = the letter was made from this very OneDrive file (same file id). Only then may
      // the worker finish moving it to Processed_Mail. Otherwise a different file reuses a name that
      // was already used: staff must look at it.
      // An older importer stored the same file id as onedrive_<id>; the current one as onedrive_import_<id>.
      const sameFile = Boolean(
        payload.oneDriveFileId &&
        [`onedrive_import_${payload.oneDriveFileId}`, `onedrive_${payload.oneDriveFileId}`].includes(existingMailItem.idempotency_key)
      );

      return res.status(200).json({
        ok: true,
        skipped: true,
        data: {
          mailId: existingMailItem.id,
          reason: sameFile ? 'duplicate_file_for_user' : 'name_already_used',
          sameFile,
        },
      });
    }

    // The date must come from the filename: never guess it from when the file was saved.
    // Same parser as the worker and the Filenames tool (user{ID}_{DD-MM-YY}_{TYPE}.pdf)
    const parsedName = parseMailFilename(payload.fileName);
    const dateFromFilename = parsedName?.dateIso
      ? new Date(`${parsedName.dateIso}T00:00:00.000Z`)
      : tryParseDateFromFilename(payload.fileName);
    if (!dateFromFilename) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_filename_date',
        message: 'The date in the filename is missing or not a real date (use DD-MM-YY).',
        fileName: payload.fileName,
      });
    }
    if (dateFromFilename.getTime() > nowMs() + 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        ok: false,
        error: 'filename_date_in_future',
        message: 'The date in the filename is in the future.',
        fileName: payload.fileName,
      });
    }

    // Generate idempotency key from OneDrive file ID or filename
    const idempotencyKey = payload.oneDriveFileId
      ? `onedrive_import_${payload.oneDriveFileId}`
      : `onedrive_import_${payload.fileName}_${receivedAtMs}`;

    const { subject, senderName, emailLabel } = letterDetailsFromType(payload.sourceSlug);
    // Store the file's stable SharePoint link straight away so the letter opens even before it is moved.
    // Temporary pre-signed download links (older workers) are never stored.
    const offeredLink = payload.oneDriveDownloadUrl || null;
    const initialScanLink =
      offeredLink && !/tempauth=|download\.aspx/i.test(offeredLink) ? offeredLink : null;
    const dateFromName = dateFromFilename;
    const mailTypeValue: string | null = null; // no automatic classification

    // Use date from filename if available, otherwise use receivedAtMs
    const finalReceivedDate = dateFromName 
      ? dateFromName.toISOString().split('T')[0]
      : new Date(receivedAtMs).toISOString().split('T')[0];

    // Check if locked columns exist (migration 042 may not have run)
    const hasLockedColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mail_item' AND column_name = 'locked'
    `).then(r => r.rows.length > 0).catch(() => false);

    const { getPrimaryBusinessIdForUser } = await import('../../lib/business-helpers');
    const primaryBusinessId = await getPrimaryBusinessIdForUser(payload.userId);
    if (primaryBusinessId == null) {
      // Every mail item must belong to a business. Signup creates one; this guards older accounts.
      logger.error('[internalMailImport] user has no business; mail item not created', { userId: payload.userId });
      return res.status(422).json({ ok: false, error: 'no_business', message: 'User has no business record to attach mail to.' });
    }

    // Insert mail item with scan_file_url initially null
    // The worker will move the file to processed folder and update this URL with the final location
    // Always create the mail item, but mark it as locked if user/plan/kyc is inactive
    let result;
    if (hasLockedColumns) {
      // Migration 042 has run - use locked columns
      result = await pool.query(
        `INSERT INTO mail_item (
          idempotency_key, user_id, business_id, subject, sender_name, received_date,
          scan_file_url, file_size, scanned, status, tag, source_slug, notes,
          received_at_ms, created_at, updated_at, locked, locked_reason, admin_note,
          mail_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (idempotency_key) DO UPDATE SET
          updated_at = mail_item.updated_at
        RETURNING id, subject, status, tag, locked, locked_reason, (xmax::text <> '0') AS already_existed`,
        [
          idempotencyKey,                    // $1: idempotency_key
          payload.userId,                     // $2: user_id
          primaryBusinessId,                  // $3: business_id
          subject,                            // $4: subject
          senderName,                         // $5: sender_name
          finalReceivedDate,                  // $6: received_date (from filename or receivedAtMs)
          initialScanLink,                    // $7: scan_file_url - the file's stable inbox link; updated after the move
          0,                                  // $8: file_size (not provided in payload)
          true,                               // $9: scanned (true for OneDrive files)
          'received',                         // $10: status
          null,                               // $11: tag — always null on create; users set tags in-app only (source_slug carries filename slug for HMRC/CH routing)
          payload.sourceSlug,                 // $12: source_slug (from filename, for forwarding/KYC)
          `OneDrive import: ${payload.fileName}`, // $13: notes
          receivedAtMs,                       // $14: received_at_ms
          now,                                // $15: created_at
          now,                                // $16: updated_at
          locked,                             // $17: locked
          lockedReason,                       // $18: locked_reason
          locked ? `Ingested while ${lockedReason}` : null, // $19: admin_note
          mailTypeValue,                      // $20: mail_type (none: no automatic classification)
        ]
      );
    } else {
      // Migration 042 has NOT run - create mail item without locked columns
      logger.warn('[internalMailImport] locked columns not available - migration 042 not run', {
        fileName: payload.fileName,
        userId: payload.userId,
        locked: locked,
        lockedReason: lockedReason,
      });
      
      result = await pool.query(
        `INSERT INTO mail_item (
          idempotency_key, user_id, business_id, subject, sender_name, received_date,
          scan_file_url, file_size, scanned, status, tag, source_slug, notes,
          received_at_ms, created_at, updated_at, admin_note,
          mail_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (idempotency_key) DO UPDATE SET
          updated_at = mail_item.updated_at
        RETURNING id, subject, status, tag, (xmax::text <> '0') AS already_existed`,
        [
          idempotencyKey,                    // $1: idempotency_key
          payload.userId,                     // $2: user_id
          primaryBusinessId,                  // $3: business_id
          subject,                            // $4: subject
          senderName,                         // $5: sender_name
          finalReceivedDate,                  // $6: received_date (from filename or receivedAtMs)
          initialScanLink,                    // $7: scan_file_url - the file's stable inbox link; updated after the move
          0,                                  // $8: file_size (not provided in payload)
          true,                               // $9: scanned (true for OneDrive files)
          'received',                         // $10: status
          null,                               // $11: tag — always null on create; users set tags in-app only
          payload.sourceSlug,                 // $12: source_slug (from filename, for forwarding/KYC)
          `OneDrive import: ${payload.fileName}`, // $13: notes
          receivedAtMs,                       // $14: received_at_ms
          now,                                // $15: created_at
          now,                                // $16: updated_at
          locked ? `Ingested while ${lockedReason} (locked columns not available)` : null, // $17: admin_note
          mailTypeValue,                      // $18: mail_type (none: no automatic classification)
        ]
      );
    }

    const mailItem = result.rows[0];

    // Another import of the same file got there first: leave that letter exactly as it is
    if (mailItem?.already_existed) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        data: { mailId: mailItem.id, reason: 'duplicate_file_for_user', sameFile: true },
      });
    }

    // Explicit log immediately after mail_item insert (after COMMIT)
    logger.info('[mailImport] ✅ mail_item created successfully', {
      mail_item_id: mailItem.id,
      user_id: payload.userId,
      subject: mailItem.subject,
      received_date: new Date(receivedAtMs).toISOString().split('T')[0],
      tag: mailItem.tag,
      fileName: payload.fileName,
      hasLockedColumns,
      locked: hasLockedColumns ? (mailItem.locked === true) : false,
      locked_reason: hasLockedColumns ? (mailItem.locked_reason || null) : null,
    });

    const isLocked = hasLockedColumns ? (mailItem.locked === true) : false;
    logger.info('[mailImport] Successfully created NEW mail item:', {
      mailId: mailItem.id,
      userId: payload.userId,
      subject: mailItem.subject,
      tag: mailItem.tag,
      fileName: payload.fileName,
      oneDriveFileId: payload.oneDriveFileId,
      locked: isLocked,
      lockedReason: hasLockedColumns ? (mailItem.locked_reason || null) : null,
      entitlement: {
        entitled: entitlement.entitled,
        reason: entitlement.reason,
        subscriptionStatus: entitlement.subscriptionStatus,
      },
      userStatus: user.status,
      kycStatus: user.kyc_status,
      willSendEmail: !isLocked,
    });

    // VERIFY mail item exists in database before sending emails
    const verifyResult = await pool.query(
      'SELECT id, user_id, subject, tag, status FROM mail_item WHERE id = $1',
      [mailItem.id]
    );

    if (verifyResult.rows.length === 0) {
      logger.error('[internalMailImport] CRITICAL: Mail item not found in DB after insert! MailId:', mailItem.id);
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
      logger.error('[internalMailImport] ❌ CRITICAL: userId mismatch!', {
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
      logger.error('[internalMailImport] ❌ CRITICAL: User not found for email!', {
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
      logger.error('[internalMailImport] ❌ CRITICAL: Email mismatch!', {
        fileName: payload.fileName,
        mailId: verifiedMailItem.id,
        userId: verifiedUserId,
        expectedEmail: user.email,
        actualEmail: userForEmail.email,
      });
      return res.status(500).json({
        ok: false,
        error: 'email_mismatch',
        message: 'Internal data consistency error. Please contact support.',
      });
    }

    logger.info('[internalMailImport] ✅ Verified mail item exists in DB with correct user:', {
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
        logger.info('[mailImport] 📧 Attempting to send Postmark email notification:', {
          email: userForEmail.email,
          userId: verifiedMailItem.user_id,
          mailId: verifiedMailItem.id,
          fileName: payload.fileName,
          letterType: emailLabel,
          subject: verifiedMailItem.subject,
        });

        await sendMailScanned({
          email: userForEmail.email, // Use verified email from database
          firstName: userForEmail.first_name || "there",
          subject: emailLabel ? `New mail received - ${emailLabel}` : 'New mail received',
          cta_url: `${process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app'}/dashboard`
        });
        
        logger.info('[mailImport] ✅ Postmark email notification sent successfully:', {
          email: userForEmail.email,
          userId: verifiedMailItem.user_id,
          mailId: verifiedMailItem.id,
          fileName: payload.fileName,
          letterType: emailLabel,
          confirmation: 'Mail item is confirmed in database for this user',
        });
      } catch (emailError) {
        logger.error('[mailImport] new-mail email failed', {
          to: userForEmail.email,
          mail_item_id: verifiedMailItem.id,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
        logger.error('[mailImport] ❌ Failed to send email notification to user:', {
          email: userForEmail.email,
          userId: verifiedMailItem.user_id,
          mailId: verifiedMailItem.id,
          fileName: payload.fileName,
          error: emailError,
        });
        // Don't fail the webhook if email fails, but log it clearly
      }
    } else {
      // Restricted account: tell the customer only THAT mail is waiting and what to finish.
      // No sender, subject, tag, scan or contents may appear in this message.
      try {
        await sendMailWaiting({
          email: userForEmail.email,
          firstName: userForEmail.first_name || 'there',
          cta_url: `${(process.env.APP_BASE_URL || '').replace(/\/+$/, '')}/account/overview`,
        });
        await getPool().query(
          `INSERT INTO notification (user_id, type, title, body, created_at) VALUES ($1, 'mail_waiting', 'Mail is waiting', $2, $3)`,
          [verifiedMailItem.user_id, 'Mail has arrived for you. Complete the outstanding steps on your account to view it.', Date.now()]
        ).catch(() => {});
      } catch (emailError) {
        logger.error('[mailImport] mail-waiting email failed', { mail_item_id: verifiedMailItem.id });
      }
      logger.info('[mailImport] new-mail email skipped - mail item is locked', {
        mail_item_id: verifiedMailItem.id,
        userId: verifiedMailItem.user_id,
        lockedReason: hasLockedColumns ? (mailItem.locked_reason || null) : 'locked columns not available',
      });
      logger.info('[internalMailImport] ⚠️ Skipping email notification - mail item is locked', {
        mailId: verifiedMailItem.id,
        userId: verifiedMailItem.user_id,
        lockedReason: hasLockedColumns ? (mailItem.locked_reason || null) : 'locked columns not available',
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
      logger.info('[internalMailImport] ✅ Ops notification sent:', {
        mailId: verifiedMailItem.id,
        userId: verifiedMailItem.user_id,
        userEmail: userForEmail.email,
        fileName: payload.fileName,
      });
    } catch (opsEmailError) {
      logger.error('[internalMailImport] ❌ Failed to send ops notification:', {
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
    logger.error('[mailImport] mail insert failed — email skipped', {
      error: error.message || String(error),
      fileName: payload?.fileName || 'unknown',
      userId: payload?.userId || 'unknown',
    });
    logger.error('[internalMailImport] Error:', error);
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
      logger.error('[internalMailImport] MAIL_IMPORT_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        ok: false,
        error: 'server_configuration_error',
        message: 'Mail import webhook secret not configured',
      });
    }

    if (!secret || !timingSafeStringEqual(String(secret), expectedSecret)) {
      logger.warn('[internalMailImport] Invalid or missing secret header');
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

    // The file has moved: point this letter at its new place, plus any other letter of the same customer
    // imported from the very same OneDrive file (same item id, in either key format). Letters from a
    // different file are never touched, even if they share the old link or the file name.
    const updateResult = await pool.query(
      `WITH target AS (
         SELECT id, user_id, substring(idempotency_key from '^onedrive(?:_import)?_(.+)$') AS item_id
         FROM mail_item WHERE id = $3
       )
       UPDATE mail_item m SET scan_file_url = $1, updated_at = $2
       FROM target t
       WHERE m.id = t.id
          OR (t.item_id IS NOT NULL AND m.user_id = t.user_id
              AND m.idempotency_key IN ('onedrive_import_' || t.item_id, 'onedrive_' || t.item_id))
       RETURNING m.id, m.scan_file_url`,
      [scanFileUrl, nowMs(), mailId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'mail_item_not_found',
        message: `Mail item ${mailId} not found`,
      });
    }

    logger.info('[internalMailImport] Updated scan_file_url for mail item', {
      mailId,
      lettersUpdated: updateResult.rows.length,
    });

    return res.status(200).json({
      ok: true,
      data: {
        mailId,
        lettersUpdated: updateResult.rows.length,
      },
    });
  } catch (error: any) {
    logger.error('[internalMailImport] Error updating scan_file_url:', error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

// Status report from the OneDrive worker after each run (shown to staff on the Mail and Filenames pages)
const ImporterReportPayload = z.object({
  ok: z.boolean(),
  problem: z.enum(['onedrive_access_denied', 'onedrive_folder_not_found', 'microsoft_sign_in_failed', 'not_configured', 'onedrive_error']).nullable().optional(),
  problemDetail: z.string().max(1000).nullable().optional(),
  filesInInbox: z.number().int().min(0).nullable().optional(),
  imported: z.number().int().min(0).nullable().optional(),
  intervalMs: z.number().int().positive().nullable().optional(),
  issues: z.array(z.object({
    fileName: z.string().max(1000),
    reason: z.enum(['bad_filename', 'customer_not_found', 'no_business', 'conflict', 'move_pending', 'import_failed']),
    detail: z.string().max(1000).nullable().optional(),
  })).max(500).optional(),
});

router.post('/from-onedrive/status', (req, res) => {
  const expectedSecret = process.env.MAIL_IMPORT_WEBHOOK_SECRET;
  const secret = req.headers['x-mail-import-secret'];
  if (!expectedSecret) {
    return res.status(500).json({ ok: false, error: 'server_configuration_error' });
  }
  if (!secret || !timingSafeStringEqual(String(secret), expectedSecret)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const parsed = ImporterReportPayload.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'validation_error' });
  }
  recordImporterReport(parsed.data);
  return res.json({ ok: true });
});

export default router;
