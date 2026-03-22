/**
 * Admin Audit Routes
 *
 * GET /api/admin-audit/           — paginated admin_audit log
 * GET /api/admin-audit/mail-audit — paginated mail_audit log, optionally filtered by item_id
 *
 * Both endpoints: admin-only (req.user.is_admin).
 * Pagination: limit (1–100, default 20) + offset (default 0).
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseLimit(raw: unknown, def = 20): number {
  return Math.max(1, Math.min(100, Number(raw ?? def) || def));
}

function parseOffset(raw: unknown): number {
  return Math.max(0, Number(raw ?? 0) || 0);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin-audit
 * Returns paginated rows from the admin_audit table.
 * Query params: limit (1–100, default 20), offset (default 0)
 */
router.get('/', async (req: Request, res: Response) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  const limit  = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  try {
    const pool = getPool();

    const [itemsResult, totalResult] = await Promise.all([
      pool.query(
        `SELECT id, admin_id, action, target_type, target_id, details, created_at
         FROM admin_audit
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS c FROM admin_audit`),
    ]);

    const total = parseInt(totalResult.rows[0].c, 10);

    return res.json({ ok: true, total, items: itemsResult.rows });
  } catch (error: any) {
    console.error('[GET /api/admin-audit] error:', error);
    return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
  }
});

/**
 * GET /api/admin-audit/mail-audit
 * Returns paginated rows from the mail_audit table.
 * Query params: item_id (optional), limit (1–100, default 20), offset (default 0)
 *
 * Note: before_json and after_json are parsed to objects in the response
 * to match client expectations.
 */
router.get('/mail-audit', async (req: Request, res: Response) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  const itemId = req.query.item_id ? Number(req.query.item_id) : null;
  const limit  = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  try {
    const pool = getPool();

    // Build optional WHERE clause
    const conditions: string[] = [];
    const params: unknown[]    = [];
    let   p = 1;

    if (itemId) {
      conditions.push(`item_id = $${p++}`);
      params.push(itemId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [itemsResult, totalResult] = await Promise.all([
      pool.query(
        `SELECT id, item_id, user_id, action, before_json, after_json, created_at
         FROM mail_audit
         ${where}
         ORDER BY created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) AS c FROM mail_audit ${where}`, params),
    ]);

    const total = parseInt(totalResult.rows[0].c, 10);

    // Parse JSON snapshot columns for the client
    const items = itemsResult.rows.map((r) => ({
      ...r,
      before: r.before_json ? JSON.parse(r.before_json) : null,
      after:  r.after_json  ? JSON.parse(r.after_json)  : null,
    }));

    return res.json({ ok: true, total, items });
  } catch (error: any) {
    // mail_audit table may not exist in all environments — return a clear 503
    if (error?.code === '42P01') {
      return res.status(503).json({ ok: false, error: 'mail_audit_table_not_available' });
    }
    console.error('[GET /api/admin-audit/mail-audit] error:', error);
    return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
  }
});

export default router;
