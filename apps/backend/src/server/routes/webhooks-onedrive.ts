import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { getPool } from '../db';
import { nowMs } from '../../lib/time';

const router = Router();

// Optional auth envs
const EXPECTED_SHARED_SECRET = process.env.ONEDRIVE_WEBHOOK_SECRET || '';
const BASIC_USER = process.env.ONEDRIVE_WEBHOOK_BASIC_USER || '';
const BASIC_PASS = process.env.ONEDRIVE_WEBHOOK_BASIC_PASS || '';

function parseBasic(auth?: string) {
  if (!auth || !auth.startsWith('Basic ')) return null;
  try {
    const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':');
    return { user, pass };
  } catch { return null; }
}

// Helper functions
const pick = (v: any) => (v === '' || v == null ? undefined : v);
const toNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);
const isoToMs = (iso: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date.getTime();
};

// Extract user ID from filename using userID_date pattern ONLY
const extractUserIdFromName = (name: string, path: string): number | null => {
  const text = `${name} ${path}`;

  // ONLY pattern: userID_date (e.g., user44_12_04_2022.pdf, user39_12_03_1990.pdf)
  const patterns = [
    /user(\d+)_\d{1,2}_\d{1,2}_\d{4}/i,     // user44_12_04_2022.pdf, user39_12_03_1990.pdf
    /user(\d+)_\d{2}_\d{2}_\d{4}/i,          // user44_12_04_2022.pdf (strict 2-digit format)
    /user(\d+)_\d{1,2}_\d{1,2}_\d{2}/i,      // user44_12_04_22.pdf (2-digit year)
    /user(\d+)_\d{2}_\d{2}_\d{2}/i           // user44_12_04_22.pdf (strict 2-digit format)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const userId = Number(match[1]);
      if (userId > 0 && userId < 10000) { // Reasonable user ID range
        return userId;
      }
    }
  }

  return null;
};

// ---- Per-route raw capture ----
router.use(express.raw({ type: 'application/json' }), (req: any, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    try {
      req.parsedBody = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      req.parsedBody = undefined;
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

  try {
    const pool = getPool();

    // Extract OneDrive data (handle placeholder text from Zapier)
    const userId = pick(body.userId);
    const itemId = pick(body.itemId);
    const name = pick(body.name) ?? '(unnamed)';
    const path = pick(body.path) ?? '/';
    const mimeType = pick(body.mimeType);
    const size = toNum(body.size) ?? 0;
    const webUrl = pick(body.webUrl);
    const lastModifiedDateTime = pick(body.lastModifiedDateTime);
    const event = pick(body.event) ?? 'created';

    // Clean up placeholder text from Zapier (with null checks)
    const cleanName = (name && name.includes('↳')) ? 'unknown_file.pdf' : name;
    const cleanPath = (path && path.includes('↳')) ? '/' : path;
    const cleanItemId = (itemId && itemId.includes('↳')) ? `placeholder_${Date.now()}` : itemId;

    // Try to extract userId from filename if not provided
    const userIdFromFile = extractUserIdFromName(cleanName, cleanPath);
    const finalUserId = userId || userIdFromFile;

    console.log('[OneDrive Webhook] User ID extraction:', {
      userIdFromFile,
      finalUserId,
      originalName: name,
      cleanName,
      originalPath: path,
      cleanPath
    });

    // Validation
    if (!finalUserId) {
      console.log('[OneDrive Webhook] Validation failed: missing userId', {
        userId,
        userIdFromFile,
        originalName: name,
        cleanName,
        originalPath: path,
        cleanPath
      });
      return res.status(400).json({
        ok: false,
        error: 'missing_userId',
        message: 'userId not provided and could not extract from filename',
        filename: cleanName,
        path: cleanPath,
        suggestions: [
          'Add userId to webhook payload',
          'Use filename pattern: user44_12_04_2022.pdf (userID_date)',
          'Use filename pattern: user39_12_03_1990.pdf (userID_date)',
          'Use filename pattern: user22_10_02_2025.pdf (userID_date)',
          'Use filename pattern: user44_12_04_22.pdf (userID_date with 2-digit year)'
        ]
      });
    }
    if (!cleanItemId) {
      console.log('[OneDrive Webhook] Validation failed: missing itemId', { itemId, cleanItemId });
      return res.status(400).json({ ok: false, error: 'missing_itemId' });
    }

    // Verify user exists
    const { rows: userRows } = await pool.query('SELECT id, email, first_name, last_name FROM "user" WHERE id = $1', [finalUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'user_not_found',
        userId: finalUserId,
        message: `User ${finalUserId} does not exist`
      });
    }

    const user = userRows[0];
    const now = nowMs();
    const receivedAtMs = isoToMs(lastModifiedDateTime) ?? now;

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

    // Upsert mail item (create or update)
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
      RETURNING id, subject, status`,
      [
        idempotencyKey,           // $1: idempotency_key
        finalUserId,              // $2: user_id
        cleanName,                // $3: subject (use filename as subject)
        'OneDrive Scan',          // $4: sender_name
        new Date(receivedAtMs).toISOString().split('T')[0], // $5: received_date (YYYY-MM-DD)
        webUrl,                   // $6: scan_file_url
        size,                     // $7: file_size
        true,                     // $8: scanned (true for OneDrive files)
        'received',               // $9: status
        'OneDrive',               // $10: tag
        `OneDrive path: ${cleanPath}`, // $11: notes
        receivedAtMs,             // $12: received_at_ms
        now,                      // $13: created_at
        now                       // $14: updated_at
      ]
    );

    const mailItem = result.rows[0];

    // Log webhook event
    await pool.query(
      `INSERT INTO webhook_log (source, event_type, payload_json, created_at, received_at_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      ['onedrive', event, JSON.stringify(body), now, now]
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
