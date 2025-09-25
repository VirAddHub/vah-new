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

// Get forwarding queue
router.get('/api/admin/forwarding/queue', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { status, search, limit = 20, offset = 0 } = req.query;

    try {
        const { rows } = await pool.query(`
            SELECT fr.id, fr.user_id, u.first_name, u.last_name, u.email,
                   fr.created_at, fr.status, fr.items_count, fr.carrier, fr.tracking_number
            FROM mail_item fr
            JOIN "user" u ON u.id = fr.user_id
            WHERE fr.forwarded_physically = true
              AND ($1::text IS NULL OR fr.status = $1)
              AND ($2::text IS NULL OR (u.email ILIKE '%'||$2||'%' OR u.first_name ILIKE '%'||$2||'%' OR u.last_name ILIKE '%'||$2||'%'))
            ORDER BY fr.created_at DESC
            LIMIT $3 OFFSET $4
        `, [status || null, search || null, parseInt(limit), parseInt(offset)]);

        ok(res, { requests: rows });
    } catch (err) {
        console.error('[admin.forwarding.queue] error', err);
        ok(res, { requests: [] });
    }
}));

// Fulfill forwarding request
router.post('/api/admin/forwarding/requests/:id/fulfill', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { carrier, tracking_number } = req.body;

    if (!carrier || !tracking_number) {
        return badRequest(res, 'carrier and tracking_number are required');
    }

    const { rows } = await pool.query(`
        UPDATE mail_item 
        SET status = 'fulfilled', carrier = $1, tracking_number = $2, updated_at = $3
        WHERE id = $4 AND forwarded_physically = true
        RETURNING id, user_id, status, carrier, tracking_number, updated_at
    `, [carrier, tracking_number, Math.floor(Date.now()), id]);

    if (rows.length === 0) {
        return notFound(res, 'Forwarding request not found');
    }

    ok(res, { request: rows[0] });
}));

// Cancel forwarding request
router.post('/api/admin/forwarding/requests/:id/cancel', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const { rows } = await pool.query(`
        UPDATE mail_item 
        SET status = 'cancelled', updated_at = $1
        WHERE id = $2 AND forwarded_physically = true
        RETURNING id, user_id, status, updated_at
    `, [Math.floor(Date.now()), id]);

    if (rows.length === 0) {
        return notFound(res, 'Forwarding request not found');
    }

    ok(res, { request: rows[0] });
}));

export default router;
