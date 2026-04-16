/**
 * Admin Forward Audit Routes
 *
 * GET /api/admin-forward-audit/
 *   — Paginated rows from the forward_audit table.
 *   — Optionally filtered by mail_item_id.
 *   — Admin-only (unconditional — not environment-gated).
 *
 * Fixed from JS original:
 *   - JS had `if (!is_admin && NODE_ENV === 'production')` which allowed
 *     non-admin access in dev/staging. TS version enforces admin always.
 *   - JS used synchronous `db.prepare()`. TS uses async Postgres pool.
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { safeErrorMessage } from '../../lib/safeError';

const router = Router();

/**
 * GET /api/admin-forward-audit
 * Query params: mail_item_id? (integer), limit (default 50, max 200), offset (default 0)
 */
router.get('/', async (req: Request, res: Response) => {
  // Enforce admin unconditionally — never allow in any environment
  if (!req.user?.is_admin) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  const mailItemId = req.query.mail_item_id ? Number(req.query.mail_item_id) : null;
  const limit      = Math.max(1, Math.min(200, Number(req.query.limit  ?? 50)  || 50));
  const offset     = Math.max(0,               Number(req.query.offset ?? 0)   || 0);

  try {
    const pool = getPool();

    const params: unknown[] = [];
    let   p = 1;

    const whereClause = mailItemId
      ? `WHERE mail_item_id = $${p++}`
      : '';

    if (mailItemId) params.push(mailItemId);
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT id, mail_item_id, user_id, result, reason, created_at
       FROM forward_audit
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      params,
    );

    return res.json({ ok: true, items: result.rows });
  } catch (error: any) {
    if (error?.code === '42P01') {
      // forward_audit table may not exist yet — non-fatal
      return res.json({ ok: true, items: [] });
    }
    console.error('[GET /api/admin-forward-audit] error:', error);
    return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
  }
});

export default router;
