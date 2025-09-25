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
    const { status, search, page = 1, page_size = 25 } = req.query;
    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    try {
        // Get total count for pagination
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM mail_item fr
            JOIN "user" u ON u.id = fr.user_id
            WHERE fr.forwarded_physically = true
              AND ($1::text IS NULL OR fr.status = $1)
              AND ($2::text IS NULL OR (u.email ILIKE '%'||$2||'%' OR u.first_name ILIKE '%'||$2||'%' OR u.last_name ILIKE '%'||$2||'%'))
        `, [status || null, search || null]);

        const { rows } = await pool.query(`
            SELECT fr.id, 
                   CONCAT(u.first_name, ' ', u.last_name) as user_name,
                   fr.id as mail_item_id,
                   fr.destination_address,
                   fr.status,
                   to_timestamp(fr.created_at / 1000) as requested_at
            FROM mail_item fr
            JOIN "user" u ON u.id = fr.user_id
            WHERE fr.forwarded_physically = true
              AND ($1::text IS NULL OR fr.status = $1)
              AND ($2::text IS NULL OR (u.email ILIKE '%'||$2||'%' OR u.first_name ILIKE '%'||$2||'%' OR u.last_name ILIKE '%'||$2||'%'))
            ORDER BY fr.created_at DESC
            LIMIT $3 OFFSET $4
        `, [status || null, search || null, limit, offset]);

        ok(res, { 
            items: rows, 
            total: parseInt(countResult.rows[0].total) 
        });
    } catch (err) {
        console.error('[admin.forwarding.queue] error', err);
        ok(res, { items: [], total: 0 });
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

    ok(res, {});
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

    ok(res, {});
}));

export default router;
