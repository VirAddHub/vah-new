/**
 * File Routes
 *
 * GET  /api/files               — list files for authenticated user (scoped per-user)
 * POST /api/files/:id/signed-url — generate a signed download URL via Make webhook
 *
 * Auth: JWT required (enforced by global middleware).
 * Rate limit: max 30 signed-url requests per user per 60s (enforced in handler).
 * Security: ownership check on every file row before returning data.
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

// ─── Audit helpers ─────────────────────────────────────────────────────────────

/**
 * Ensure the file_link_audit table exists.
 * Called lazily on first signed-url request.
 * Uses IF NOT EXISTS so it is safe to call repeatedly.
 */
async function ensureLinkAuditTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_link_audit (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      file_id    INTEGER NOT NULL,
      cached     INTEGER NOT NULL,
      ok         INTEGER NOT NULL,
      err        TEXT,
      ip         TEXT,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS fla_user_created ON file_link_audit(user_id, created_at DESC);
  `);
}

/**
 * Insert one row into file_link_audit.
 * Non-fatal — logs and swallows errors to never block the response.
 */
async function auditLink(opts: {
  userId: number;
  fileId: number;
  cached: 0 | 1;
  ok: 0 | 1;
  err: string | null;
  ip: string;
}): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO file_link_audit (user_id, file_id, cached, ok, err, ip, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [opts.userId, opts.fileId, opts.cached, opts.ok, opts.err, opts.ip, Date.now()],
    );
  } catch (err) {
    console.error('[files] auditLink error (non-fatal):', err);
  }
}

/**
 * True if the user has made >= 30 signed-url requests in the last 60 seconds.
 */
async function isRateLimited(userId: number): Promise<boolean> {
  const pool = getPool();
  const since = Date.now() - 60_000;
  const result = await pool.query(
    `SELECT COUNT(*) AS c FROM file_link_audit WHERE user_id = $1 AND created_at > $2`,
    [userId, since],
  );
  return Number(result.rows[0]?.c ?? 0) >= 30;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/files
 * Query params: mail_item_id?, deleted=(0|1), limit, offset
 * Returns files scoped to the authenticated user.
 */
router.get('/', async (req: Request, res: Response) => {
  const userId = Number(req.user?.id ?? 0);
  if (!userId) return res.status(401).json({ ok: false, error: 'unauthenticated' });

  const mailItemId = req.query.mail_item_id ? Number(req.query.mail_item_id) : null;
  const deleted = (req.query.deleted ?? '0') === '1' ? 1 : 0;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, user_id, mail_item_id, name, path, size, mime, etag,
              web_url, share_url, share_expires_at, deleted,
              created_at, updated_at
       FROM file
       WHERE user_id = $1
         AND ($2::integer IS NULL OR mail_item_id = $2)
         AND deleted = $3
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [userId, mailItemId, deleted, limit, offset],
    );
    return res.json({ ok: true, items: result.rows, limit, offset });
  } catch (err) {
    console.error('[files] GET / error:', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

/**
 * POST /api/files/:id/signed-url
 * Generates a short-lived signed download URL for a file via the Make webhook.
 * Caches the URL in the DB until 60s before expiry.
 * Enforces per-user rate limit of 30 requests/60s.
 */
router.post('/:id/signed-url', async (req: Request, res: Response) => {
  const ip = String(req.ip ?? '').trim();

  const userId = Number(req.user?.id ?? 0);
  if (!userId) return res.status(401).json({ ok: false, error: 'unauthenticated' });

  const fileId = Number(req.params.id ?? 0);
  if (!fileId) return res.status(400).json({ ok: false, error: 'bad_id' });

  try {
    await ensureLinkAuditTable();

    // Rate limit check
    if (await isRateLimited(userId)) {
      await auditLink({ userId, fileId, cached: 0, ok: 0, err: 'rate_limited', ip });
      return res.status(429).json({ ok: false, error: 'rate_limited' });
    }

    const pool = getPool();

    // Load file row — ownership check enforced
    const fileResult = await pool.query(
      `SELECT id, user_id, deleted, drive_id, item_id, path, name, mime, share_url, share_expires_at FROM file WHERE id = $1`,
      [fileId]
    );
    const f = fileResult.rows[0] ?? null;

    if (!f || Number(f.user_id) !== userId) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    // Hard-deleted files are gone from storage — 410
    if (f.deleted) {
      await auditLink({ userId, fileId, cached: 0, ok: 0, err: 'gone', ip });
      return res.status(410).json({ ok: false, error: 'gone' });
    }

    // Cache hit: return existing signed URL if still valid (with 60s safety window)
    const soon = Date.now() + 60_000;
    if (f.share_url && f.share_expires_at && Number(f.share_expires_at) > soon) {
      await auditLink({ userId, fileId, cached: 1, ok: 1, err: null, ip });
      return res.json({
        ok: true,
        url: f.share_url,
        expires_at: Number(f.share_expires_at),
        cached: true,
      });
    }

    // Require Make webhook to be configured
    const hookUrl = process.env.MAKE_SIGN_DOWNLOAD_URL ?? '';
    if (!hookUrl) {
      await auditLink({ userId, fileId, cached: 0, ok: 0, err: 'sign_service_unavailable', ip });
      return res.status(500).json({ ok: false, error: 'sign_service_unavailable' });
    }

    // Call Make webhook to get a fresh signed URL
    const resp = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.MAKE_SIGN_DOWNLOAD_SECRET ?? '',
        driveId: f.drive_id,
        itemId: f.item_id,
        path: f.path,
        name: f.name,
        mime: f.mime,
      }),
    });

    const j = (await resp.json()) as { url?: string; expires_at?: number };

    if (!resp.ok || !j?.url) {
      await auditLink({ userId, fileId, cached: 0, ok: 0, err: 'sign_failed', ip });
      return res.status(502).json({ ok: false, error: 'sign_failed', detail: j });
    }

    const expires = Number(j.expires_at ?? 0) || Date.now() + 15 * 60_000;

    // Persist the new signed URL for caching
    await pool.query(
      `UPDATE file SET share_url = $1, share_expires_at = $2, updated_at = $3 WHERE id = $4`,
      [String(j.url), expires, Date.now(), f.id],
    );

    await auditLink({ userId, fileId, cached: 0, ok: 1, err: null, ip });
    return res.json({ ok: true, url: j.url, expires_at: expires, cached: false });
  } catch (err) {
    console.error('[files] POST /:id/signed-url error:', err);
    await auditLink({ userId, fileId, cached: 0, ok: 0, err: 'sign_error', ip }).catch(() => {});
    return res.status(502).json({ ok: false, error: 'sign_error' });
  }
});

export default router;
