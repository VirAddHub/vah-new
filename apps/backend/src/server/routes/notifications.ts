/**
 * Notifications Routes
 *
 * GET /api/notifications           - paginated notifications
 * POST /api/notifications/mark-read - mark one/many/all as read
 *
 * Fixed from JS original:
 *  - Uses async Postgres pool instead of synchronous SQLite db.prepare()
 *  - `unreadCount` helper is inlined using async query
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

/** GET /api/notifications?limit=&offset=&unreadOnly=true|false */
router.get('/', async (req: Request, res: Response) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'unauthenticated' });
  }

  const limit      = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const offset     = Math.max(0, Number(req.query.offset || 0));
  const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';

  const where = ['user_id = $1'];
  const args: any[] = [userId];
  
  if (unreadOnly) {
    where.push('read_at IS NULL');
  }

  try {
    const pool = getPool();

    const [itemsResult, totalResult, unreadResult] = await Promise.all([
      pool.query(
        `SELECT id, type, title, body, meta, created_at, read_at
         FROM notification
         WHERE ${where.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [...args, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS c FROM notification WHERE ${where.join(' AND ')}`,
        args
      ),
      pool.query(
        `SELECT COUNT(*) AS c FROM notification WHERE user_id = $1 AND read_at IS NULL`,
        [userId]
      )
    ]);

    const total = parseInt(totalResult.rows[0].c, 10);
    const unread = parseInt(unreadResult.rows[0].c, 10);

    const items = itemsResult.rows.map(n => ({
      ...n,
      meta: n.meta ? (typeof n.meta === 'string' ? JSON.parse(n.meta) : n.meta) : null
    }));

    return res.json({ ok: true, total, unread, items });
  } catch (error: any) {
    console.error('[GET /api/notifications] error:', error);
    return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
  }
});

/** POST /api/notifications/mark-read { ids?: number[] } */
router.post('/mark-read', async (req: Request, res: Response) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'unauthenticated' });
  }

  const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : null;
  const ids = rawIds ? rawIds.map(Number).filter(Boolean) : null;
  const now = Date.now();

  try {
    const pool = getPool();
    let updated = 0;

    if (ids && ids.length) {
      // Postgres ANY($3::int[]) is highly safe
      const result = await pool.query(
        `UPDATE notification SET read_at = $1 WHERE user_id = $2 AND id = ANY($3::int[])`,
        [now, userId, ids]
      );
      updated = result.rowCount ?? 0;
    } else {
      const result = await pool.query(
        `UPDATE notification SET read_at = $1 WHERE user_id = $2 AND read_at IS NULL`,
        [now, userId]
      );
      updated = result.rowCount ?? 0;
    }

    return res.json({ ok: true, updated });
  } catch (error: any) {
    console.error('[POST /api/notifications/mark-read] error:', error);
    return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
  }
});

export default router;
