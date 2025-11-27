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

    // Additional user validation checks with explicit errors
    if (user.status && user.status !== 'active') {
      console.warn('[internalMailImport] user_status_not_active', {
        fileName: payload.fileName,
        parsedUserId: payload.userId,
        userSnapshot,
      });
      return res.status(400).json({
        ok: false,
        error: 'user_status_not_active',
        message: `User ${user.id} status is ${user.status}`,
        user: userSnapshot,
      });
    }

    if (user.plan_status && user.plan_status !== 'active') {
      console.warn('[internalMailImport] user_plan_inactive', {
        fileName: payload.fileName,
        parsedUserId: payload.userId,
        userSnapshot,
      });
      return res.status(400).json({
        ok: false,
        error: 'user_plan_inactive',
        message: `User ${user.id} plan_status is ${user.plan_status}`,
        user: userSnapshot,
      });
    }

    const isKycApproved =
      user.kyc_status === 'approved' ||
      user.kyc_status === 'verified'; // legacy status label

    if (!isKycApproved) {
      console.warn('[internalMailImport] user_kyc_not_approved', {
        fileName: payload.fileName,
        parsedUserId: payload.userId,
        userSnapshot,
      });
      return res.status(400).json({
        ok: false,
        error: 'user_kyc_not_approved',
        message: `User ${user.id} KYC status is ${user.kyc_status || 'unknown'}`,
        user: userSnapshot,
      });
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

    // Generate idempotency key from OneDrive file ID or filename
    const idempotencyKey = payload.oneDriveFileId
      ? `onedrive_import_${payload.oneDriveFileId}`
      : `onedrive_import_${payload.fileName}_${receivedAtMs}`;

    // Generate subject from tag
    const subject = tagToTitle(payload.sourceSlug);

    // Insert mail item
    const result = await pool.query(
      `INSERT INTO mail_item (
        idempotency_key, user_id, subject, sender_name, received_date,
        scan_file_url, file_size, scanned, status, tag, notes,
        received_at_ms, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        updated_at = EXCLUDED.updated_at
      RETURNING id, subject, status, tag`,
      [
        idempotencyKey,                    // $1: idempotency_key
        payload.userId,                     // $2: user_id
        subject,                            // $3: subject
        'OneDrive Scan',                    // $4: sender_name
        new Date(receivedAtMs).toISOString().split('T')[0], // $5: received_date
        payload.oneDriveDownloadUrl || null, // $6: scan_file_url
        0,                                  // $7: file_size (not provided in payload)
        true,                               // $8: scanned (true for OneDrive files)
        'received',                         // $9: status
        payload.sourceSlug,                 // $10: tag
        `OneDrive import: ${payload.fileName}`, // $11: notes
        receivedAtMs,                       // $12: received_at_ms
        now,                                // $13: created_at
        now,                                // $14: updated_at
      ]
    );

    const mailItem = result.rows[0];

    console.log('[internalMailImport] Successfully created mail item:', {
      mailId: mailItem.id,
      userId: payload.userId,
      subject: mailItem.subject,
      tag: mailItem.tag,
      fileName: payload.fileName,
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
    // This ensures 100% confidence that email = correct user = correct dashboard
    try {
      await sendMailScanned({
        email: userForEmail.email, // Use verified email from database
        name: userForEmail.first_name,
        subject: `New mail received - ${subject}`,
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

    // Send ops notification AFTER successful DB insert and verification
    // This email is sent to ops@virtualaddresshub.co.uk (not the user)
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
      data: {
        mailId: mailItem.id,
      },
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

export default router;

