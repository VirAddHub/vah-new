import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getPool } from '../db';
import { nowMs } from '../../lib/time';
import { getPrimaryBusinessIdForUser } from '../../lib/business-helpers';
import { sendMailScanned } from '../../lib/mailer';
import { logger } from '../../lib/logger';
import { parseMailFilename } from '../../services/mailFilenameParser';

const router = Router();

// Webhook payload validation schema
const OneDrivePayload = z.object({
  userId: z.string().min(1).optional(),
  name: z.string().min(1),
  webUrl: z.string().url().optional(),
  /** Ignored for persistence — `mail_item.tag` stays null until the user sets a tag in the app. */
  tag: z.string().optional(),
  sender: z.string().optional(),
  subject: z.string().optional(),
  path: z.string().optional(),
  itemId: z.string().optional(),
});

// Optional auth envs
const EXPECTED_SHARED_SECRET = process.env.ONEDRIVE_WEBHOOK_SECRET || '';
const BASIC_USER = process.env.ONEDRIVE_WEBHOOK_BASIC_USER || '';
const BASIC_PASS = process.env.ONEDRIVE_WEBHOOK_BASIC_PASS || '';

function parseBasic(auth?: string) {
  if (!auth || !auth.startsWith('Basic ')) return null;
  try {
    const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':');
    return { user, pass };
  } catch (err) {
    logger.debug('[onedrive-webhook] failed to parse basic auth header');
    return null;
  }
}

// Helper functions
const pick = (v: any) => (v === '' || v == null ? undefined : v);
const toNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);

// Extract userID and date from filename (tags are manual-only, not extracted)
// Supports: user4_10-10-2024.pdf (UK format)
//           user4_2024-10-10.pdf (ISO format)
//           user4_10_10_2024.pdf (underscores)
type FilenameData = {
  userId: number;
  dateIso: string | null;  // null if no date found in filename (no "today" fallback)
} | null;

// Robust filename parser - extracts userId and date only (no tag extraction)
const extractFromFilename = (name: string): FilenameData => {
  const n = name.toLowerCase().replace(/\s+/g, "");
  const base = n.replace(/\.pdf$/, "");

  // 1) Extract userId
  const idMatch = base.match(/^user(\d+)/);
  const userId = idMatch ? Number(idMatch[1]) : null;
  if (!userId || userId <= 0 || userId >= 10000) {
    return null;
  }

  // 2) Extract date (UK or ISO format)
  const uk = base.match(/^user\d+[_\-](\d{2})[\/_\-](\d{2})[\/_\-](\d{4})/);
  const iso = base.match(/^user\d+[_\-](\d{4})[\/_\-](\d{2})[\/_\-](\d{2})/);
  let dateIso: string | null = null;

  if (uk) {
    const [, dd, mm, yyyy] = uk;
    dateIso = `${yyyy}-${mm}-${dd}`;
  } else if (iso) {
    const [, yyyy, mm, dd] = iso;
    dateIso = `${yyyy}-${mm}-${dd}`;
  }

  // Note: Tag extraction removed - tags are manual-only

  return {
    userId,
    dateIso: dateIso || null,  // No "today" fallback - let webhook use ingest time instead
  };
};

// ---- Per-route raw capture ----
router.use(express.raw({ type: 'application/json' }), (req: any, res: any, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    try {
      req.parsedBody = JSON.parse(req.rawBody.toString('utf8'));
    } catch (err) {
      // Malformed JSON should not crash the server; reject early
      return res.status(400).json({ ok: false, error: 'invalid_json' });
    }
  } else {
    req.parsedBody = req.body && typeof req.body === 'object' ? req.body : undefined;
    try {
      req.rawBody = Buffer.from(JSON.stringify(req.parsedBody ?? {}), 'utf8');
    } catch {
      req.rawBody = undefined;
    }
  }
  next();
});

router.post('/', async (req: any, res) => {
  const ct = String(req.get('content-type') || '');
  const reqId = req.get('x-request-id');

  // ---- Optional Basic auth ----
  if (BASIC_USER && BASIC_PASS) {
    const creds = parseBasic(req.get('authorization'));
    if (!creds || creds.user !== BASIC_USER || creds.pass !== BASIC_PASS) {
      return res.status(401).json({ ok: false, error: 'unauthorised' });
    }
  }

  // ---- Optional HMAC signature ----
  const hasSecret = Boolean(EXPECTED_SHARED_SECRET);
  const headerSig = req.get('x-signature');
  if (hasSecret) {
    if (!headerSig || !req.rawBody) {
      return res.status(400).json({ ok: false, error: 'missing_signature_or_raw_body' });
    }
    const h = crypto.createHmac('sha256', EXPECTED_SHARED_SECRET).update(req.rawBody).digest('hex');
    if (h !== headerSig) {
      return res.status(400).json({ ok: false, error: 'invalid_signature' });
    }
  }

  // ---- Content-Type & JSON checks ----
  if (!ct.includes('application/json')) {
    return res.status(400).json({ ok: false, error: 'invalid_content_type', ct });
  }

  const body = req.parsedBody;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  // Validate payload with Zod
  try {
    const payload = OneDrivePayload.parse(body);
    // Use validated payload
    Object.assign(body, payload);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        error: "Bad payload",
        issues: e.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    return res.status(500).json({ ok: false, error: "Internal error" });
  }

  try {
    const pool = getPool();

    // Debug logging
    console.log('[OneDrive Webhook] Received payload:', {
      userId: body.userId,
      itemId: body.itemId,
      name: body.name,
      path: body.path,
      mimeType: body.mimeType,
      size: body.size,
      webUrl: body.webUrl,
      event: body.event,
      fullBody: body
    });

    // Extract OneDrive data (handle placeholder text from Zapier)
    const userId = pick(body.userId);
    const itemId = pick(body.itemId);
    const name = pick(body.name) ?? '(unnamed)';
    const path = pick(body.path) ?? '/';
    const mimeType = pick(body.mimeType);
    const size = toNum(body.size) ?? 0;
    const webUrl = pick(body.webUrl);
    const lastModifiedDateTime = pick(body.lastModifiedDateTime); // Note: Not used for received_at_ms (uses ingest time instead)
    const event = pick(body.event) ?? 'created';

    // Optional webhook `tag` is ignored for DB `mail_item.tag` — users set tags in the app only.
    const providedTagIgnored = pick(body.tag);
    const sender = pick(body.sender);
    const subject = pick(body.subject);

    // Clean up placeholder text from Zapier (with null checks)
    const cleanName = (name && name.includes('↳')) ? 'unknown_file.pdf' : name;
    const cleanPath = (path && path.includes('↳')) ? '/' : path;
    const cleanItemId = (itemId && itemId.includes('↳')) ? `placeholder_${Date.now()}` : itemId;

    // Extract userId and date from filename (but NOT tag - manual tagging only)
    const filenameData = extractFromFilename(cleanName);
    const parsedMailFilename = parseMailFilename(cleanName);
    const sourceSlugFromFilename = parsedMailFilename?.sourceSlug ?? null;

    // Determine final values with priority: webhook payload > filename extraction
    const finalUserId = userId || filenameData?.userId || null;
    /** Always null on create — HMRC/CH routing uses `source_slug` from filename, not user `tag`. */
    const tagForInsert: string | null = null;
    // Generate subject from provided subject or use default (no tag-based subject)
    const initialSubject = subject || 'Mail received';
    const receivedDate = filenameData?.dateIso || null;

    console.log('[OneDrive Webhook] Processing details:', {
      filenameData,
      finalUserId,
      originalName: name,
      cleanName,
      originalPath: path,
      cleanPath,
      providedTagIgnored,
      userTagColumn: tagForInsert,
      sourceSlugFromFilename,
      initialSubject,
      receivedDate,
      sender,
      subject,
    });

    // Validation
    if (!finalUserId) {
      console.log('[OneDrive Webhook] Validation failed: missing userId', {
        userId,
        filenameData,
        originalName: name,
        cleanName,
        originalPath: path,
        cleanPath,
        fullPayload: body
      });

      // Check if Zapier is sending placeholder data
      const isZapierPlaceholder = name === '(unnamed)' || path === '/' ||
        (name && name.includes('↳')) ||
        (path && path.includes('↳'));

      // TEMPORARY WORKAROUND: If Zapier is sending placeholder data, 
      // try to extract userId from webUrl or other fields
      if (isZapierPlaceholder && webUrl) {
        console.log('[OneDrive Webhook] Attempting to extract userId from webUrl:', webUrl);

        // Try to extract userId from webUrl path
        const urlMatch = webUrl.match(/\/Documents\/Scanned_Mail\/user(\d+)_/);
        if (urlMatch) {
          const extractedUserId = Number(urlMatch[1]);
          console.log('[OneDrive Webhook] Extracted userId from webUrl:', extractedUserId);

          // Verify user exists
          const { rows: userRows } = await pool.query('SELECT id, email, first_name, last_name FROM "user" WHERE id = $1', [extractedUserId]);
          if (userRows.length > 0) {
            const user = userRows[0];
            const now = nowMs();
            // Use ingest time (not lastModifiedDateTime) to avoid dependency on OneDrive file operations
            const receivedAtMs = now;

            // Create a generic filename since we don't have the real one
            const genericName = `onedrive_file_${Date.now()}.pdf`;
            const idempotencyKey = `onedrive_${itemId || `placeholder_${Date.now()}`}`;
            // Use default tag and subject
            const defaultTagSlug = null; // No auto-tagging - tag must be set manually
            const defaultSubject = subject || 'Mail received';

            const primaryBusinessId = await getPrimaryBusinessIdForUser(extractedUserId);

            // Insert mail item (business_id = user's primary business for multi-business support)
            const result = await pool.query(
              `INSERT INTO mail_item (
                idempotency_key, user_id, business_id, subject, sender_name, received_date,
                scan_file_url, file_size, scanned, status, tag, source_slug, notes,
                received_at_ms, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
              ON CONFLICT (idempotency_key) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                business_id = EXCLUDED.business_id,
                subject = EXCLUDED.subject,
                sender_name = EXCLUDED.sender_name,
                received_date = EXCLUDED.received_date,
                scan_file_url = EXCLUDED.scan_file_url,
                file_size = EXCLUDED.file_size,
                scanned = EXCLUDED.scanned,
                status = EXCLUDED.status,
                source_slug = COALESCE(mail_item.source_slug, EXCLUDED.source_slug),
                notes = EXCLUDED.notes,
                received_at_ms = EXCLUDED.received_at_ms,
                updated_at = EXCLUDED.updated_at
              RETURNING id, subject, status`,
              [
                idempotencyKey,
                extractedUserId,
                primaryBusinessId,
                defaultSubject,
                'OneDrive Scan',
                new Date(receivedAtMs).toISOString().split('T')[0],
                webUrl,
                size,
                true,
                'received',
                defaultTagSlug,
                null,
                `OneDrive file (extracted from URL: ${webUrl})`,
                receivedAtMs,
                now,
                now
              ]
            );

            const mailItem = result.rows[0];

            // Send email notification to user about new mail
            try {
              await sendMailScanned({
                email: user.email,
                firstName: user.first_name || "there",
                subject: `New mail received`,
                cta_url: `${process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app'}/dashboard`
              });
              console.log('[OneDrive Webhook] Email notification sent to:', user.email);
            } catch (emailError) {
              console.error('[OneDrive Webhook] Failed to send email notification:', emailError);
              // Don't fail the webhook if email fails
            }

            // Log webhook event
            await pool.query(
              `INSERT INTO webhook_log (source, provider, event_type, payload_json, created_at, received_at_ms)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              ['onedrive', 'zapier', event, JSON.stringify(body), now, now]
            );

            return res.status(200).json({
              ok: true,
              action: 'created_or_updated_workaround',
              mailItemId: mailItem.id,
              userId: extractedUserId,
              userName: `${user.first_name} ${user.last_name}`,
              itemId: idempotencyKey,
              subject: mailItem.subject,
              status: mailItem.status,
              message: `File added to ${user.first_name}'s inbox (extracted userId from URL)`,
              workaround: true
            });
          }
        }
      }

      return res.status(400).json({
        ok: false,
        error: 'missing_userId',
        message: isZapierPlaceholder
          ? 'Zapier is sending placeholder data instead of real OneDrive file information'
          : 'userId not provided and could not extract from filename',
        filename: cleanName,
        path: cleanPath,
        isZapierPlaceholder,
        zapierFix: isZapierPlaceholder ? [
          'Check Zapier OneDrive trigger configuration',
          'Ensure "File Name" field is mapped to "name" in webhook',
          'Ensure "File Path" field is mapped to "path" in webhook',
          'Test with a real file upload, not placeholder data',
          'TEMPORARY: Upload file to /Documents/Scanned_Mail/user22_10_02_2025.pdf path'
        ] : [
          'Add userId to webhook payload',
          'Use filename pattern: user4_10-10-2024_companieshouse.pdf (UK date + tag at end)',
          'Use filename pattern: user4_2024-10-10_hmrc.pdf (ISO date + tag at end)',
          'Use filename pattern: user4_10_10_2024_barclays.pdf (underscores + tag at end)',
          'With extra words: user4_10-10-2024_bank_statement_companieshouse.pdf (last token = tag)',
          'Tags: companieshouse, hmrc, bank, insurance, utilities, general'
        ]
      });
    }
    if (!cleanItemId) {
      console.log('[OneDrive Webhook] Validation failed: missing itemId', { itemId, cleanItemId });
      return res.status(400).json({ ok: false, error: 'missing_itemId' });
    }

    // Verify user exists and get account status
    const { rows: userRows } = await pool.query(
      `SELECT id, email, first_name, last_name, plan_status, deleted_at,
              (SELECT status FROM subscription WHERE user_id = "user".id LIMIT 1) as subscription_status
       FROM "user" WHERE id = $1`,
      [finalUserId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'user_not_found',
        userId: finalUserId,
        message: `User ${finalUserId} does not exist`
      });
    }

    const user = userRows[0];
    
    // Check if account is cancelled or deleted
    const isCancelled = user.plan_status === 'cancelled' || 
                        user.subscription_status === 'cancelled' || 
                        user.deleted_at !== null;
    const now = nowMs();

    // Priority:
    // 1) Filename date (physical mail date, if provided)
    // 2) Ingest time (nowMs()), as a stable fallback (not lastModifiedDateTime)
    const receivedAtMs = receivedDate
      ? new Date(receivedDate).getTime()
      : now;

    // Create idempotency key from OneDrive itemId
    const idempotencyKey = `onedrive_${cleanItemId}`;

    // Handle different events
    if (event === 'deleted') {
      // Mark as deleted instead of removing
      await pool.query(
        `UPDATE mail_item SET deleted = true, updated_at = $1 WHERE idempotency_key = $2`,
        [now, idempotencyKey]
      );

      return res.status(200).json({
        ok: true,
        action: 'marked_deleted',
        itemId: cleanItemId,
        userId: finalUserId,
        userName: `${user.first_name} ${user.last_name}`
      });
    }

    const primaryBusinessId = await getPrimaryBusinessIdForUser(finalUserId);

    // Upsert mail item (create or update); business_id = user's primary business
    const result = await pool.query(
      `INSERT INTO mail_item (
        idempotency_key, user_id, business_id, subject, sender_name, received_date,
        scan_file_url, file_size, scanned, status, tag, source_slug, notes,
        received_at_ms, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (idempotency_key) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        business_id = EXCLUDED.business_id,
        subject = EXCLUDED.subject,
        sender_name = EXCLUDED.sender_name,
        received_date = EXCLUDED.received_date,
        scan_file_url = EXCLUDED.scan_file_url,
        file_size = EXCLUDED.file_size,
        scanned = EXCLUDED.scanned,
        status = EXCLUDED.status,
        source_slug = COALESCE(mail_item.source_slug, EXCLUDED.source_slug),
        notes = EXCLUDED.notes,
        received_at_ms = EXCLUDED.received_at_ms,
        updated_at = EXCLUDED.updated_at
      RETURNING id, subject, status`,
      [
        idempotencyKey,
        finalUserId,
        primaryBusinessId,
        initialSubject,
        'OneDrive Scan',
        new Date(receivedAtMs).toISOString().split('T')[0],
        webUrl,
        size,
        true,
        'received',
        tagForInsert,
        sourceSlugFromFilename,
        `OneDrive path: ${cleanPath}`,
        receivedAtMs,
        now,
        now
      ]
    );

    const mailItem = result.rows[0];

    console.log('[OneDrive Webhook] Successfully inserted mail item:', {
      mailItemId: mailItem.id,
      userId: finalUserId,
      subject: mailItem.subject,
      status: mailItem.status,
      userTag: tagForInsert,
      sourceSlug: sourceSlugFromFilename,
      receivedDate: new Date(receivedAtMs).toISOString().split('T')[0]
    });

    // Send email notification to user about new mail
    try {
      if (isCancelled) {
        // Account is cancelled - send "mail after cancellation" email
        const { sendMailReceivedAfterCancellation } = await import('../../lib/mailer');
        const { buildAppUrl } = await import('../../lib/mailer');
        await sendMailReceivedAfterCancellation({
          email: user.email,
          firstName: user.first_name || "there",
          name: user.first_name || user.last_name,
          subject: `New mail received`,
          cta_url: buildAppUrl('/pricing'),
        });
        console.log('[OneDrive Webhook] Mail after cancellation email sent to:', user.email);
      } else {
        // Account is active - send normal "mail scanned" email
      await sendMailScanned({
        email: user.email,
        firstName: user.first_name || "there",
        subject: `New mail received`,
        cta_url: `${process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app'}/dashboard`
      });
      console.log('[OneDrive Webhook] Email notification sent to:', user.email);
      }
    } catch (emailError) {
      console.error('[OneDrive Webhook] Failed to send email notification:', emailError);
      // Don't fail the webhook if email fails
    }

    // Log webhook event
    await pool.query(
      `INSERT INTO webhook_log (source, provider, event_type, payload_json, created_at, received_at_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['onedrive', 'zapier', event, JSON.stringify(body), now, now]
    );

    return res.status(200).json({
      ok: true,
      action: 'created_or_updated',
      mailItemId: mailItem.id,
      userId: finalUserId,
      userName: `${user.first_name} ${user.last_name}`,
      itemId: cleanItemId,
      subject: mailItem.subject,
      status: mailItem.status,
      message: `File "${cleanName}" added to ${user.first_name}'s inbox`
    });

  } catch (error: any) {
    console.error('[OneDrive Webhook] Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

export default router;