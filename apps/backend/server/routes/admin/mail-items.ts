import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok, created, notFound, badRequest } from "../../../src/lib/http";
import { requireAdmin } from "../../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// List mail items with tabs + search + paging
router.get('/api/admin/mail-items', requireAdmin, asyncHandler(async (req: any, res: any) => {
    try {
        const { q, status, page = '1', page_size = '20', user_id } = req.query as Record<string, string>;
        const limit = Math.min(parseInt(page_size || '20', 10), 100);
        const offset = (Math.max(parseInt(page || '1', 10), 1) - 1) * limit;

        const conds: string[] = [];
        const params: any[] = [];
        let i = 1;

        if (status) { conds.push(`status = $${i++}`); params.push(status); }
        if (user_id) { conds.push(`user_id = $${i++}`); params.push(Number(user_id)); }
        if (q) {
            conds.push(`(
                CAST(id AS TEXT) ILIKE $${i} OR
                EXISTS (SELECT 1 FROM "user" u WHERE u.id = mail_item.user_id AND (
                    u.email ILIKE $${i} OR u.first_name ILIKE $${i} OR u.last_name ILIKE $${i}
                ))
            )`);
            params.push(`%${q}%`); i++;
        }

        const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
        const countSql = `SELECT COUNT(*)::int AS total FROM mail_item ${where}`;
        const listSql = `SELECT id, user_id, status, tag, 
                                to_timestamp(created_at / 1000) as received_at, 
                                scan_token, forward_tracking
                         FROM mail_item ${where}
                         ORDER BY received_at DESC
                         LIMIT ${limit} OFFSET ${offset}`;

        const [count, items] = await Promise.all([
            pool.query(countSql, params),
            pool.query(listSql, params)
        ]);

        res.json({ ok: true, data: { total: count.rows[0].total, items: items.rows } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: 'server_error' });
    }
}));

// Create mail item
router.post('/api/admin/mail-items', requireAdmin, asyncHandler(async (req: any, res: any) => {
    try {
        const { user_id, status = 'received', tag = null } = req.body;
        const sql = `INSERT INTO mail_item (user_id, status, tag) VALUES ($1,$2,$3) RETURNING id`;
        const { rows } = await pool.query(sql, [user_id, status, tag]);
        res.json({ ok: true, data: { id: rows[0].id } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: 'server_error' });
    }
}));

// Update mail item tag/status
router.patch('/api/admin/mail-items/:id', requireAdmin, asyncHandler(async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { tag, status } = req.body as { tag?: string; status?: string };
        const sets: string[] = [];
        const params: any[] = [];
        let i = 1;

        if (tag !== undefined) { sets.push(`tag = $${i++}`); params.push(tag); }
        if (status !== undefined) { sets.push(`status = $${i++}`); params.push(status); }
        if (!sets.length) return res.json({ ok: true, data: { updated: 0 } });

        params.push(Number(id));
        const sql = `UPDATE mail_item SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`;
        const { rowCount } = await pool.query(sql, params);

        res.json({ ok: true, data: { updated: rowCount } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: 'server_error' });
    }
}));

// Get scan URL for mail item
router.get('/api/mail-items/:id/scan-url', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const { rows } = await pool.query(`
        SELECT scan_token
        FROM mail_item
        WHERE id = $1 AND scan_token IS NOT NULL
    `, [id]);

    if (rows.length === 0) {
        return notFound(res, 'Scan not available for this mail item');
    }

    // Construct scan URL (adjust domain as needed)
    const scanUrl = `https://vah-api-staging.onrender.com/api/mail-items/${id}/scan?token=${rows[0].scan_token}`;

    ok(res, { url: scanUrl });
}));

export default router;
