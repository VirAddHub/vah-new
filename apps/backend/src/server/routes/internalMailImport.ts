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

    // Verify user exists
    const { rows: userRows } = await pool.query(
      'SELECT id, email, first_name, last_name FROM "user" WHERE id = $1',
      [payload.userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'user_not_found',
        message: `User ${payload.userId} does not exist`,
      });
    }

    const user = userRows[0];
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
    console.log('[internalMailImport] Verified mail item exists in DB:', {
      mailId: verifiedMailItem.id,
      userId: verifiedMailItem.user_id,
      subject: verifiedMailItem.subject,
      tag: verifiedMailItem.tag,
    });

    // Send email notification to user about new mail (like old Zapier webhook)
    // Email is ONLY sent if mail item is confirmed in database
    try {
      await sendMailScanned({
        email: user.email,
        name: user.first_name,
        subject: `New mail received - ${subject}`,
        cta_url: `${process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app'}/dashboard`
      });
      console.log('[internalMailImport] ✅ Email notification sent to user:', user.email, 'for mailId:', verifiedMailItem.id);
    } catch (emailError) {
      console.error('[internalMailImport] ❌ Failed to send email notification to user:', user.email, 'Error:', emailError);
      // Don't fail the webhook if email fails
    }

    // Send ops notification AFTER successful DB insert and verification
    // This email is sent to ops@virtualaddresshub.co.uk (not the user)
    try {
      await notifyOpsMailCreated({
        mailId: verifiedMailItem.id,
        userId: payload.userId,
        subject: verifiedMailItem.subject,
        tag: verifiedMailItem.tag,
      });
      console.log('[internalMailImport] ✅ Ops notification sent for mailId:', verifiedMailItem.id);
    } catch (opsEmailError) {
      console.error('[internalMailImport] ❌ Failed to send ops notification:', opsEmailError);
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

