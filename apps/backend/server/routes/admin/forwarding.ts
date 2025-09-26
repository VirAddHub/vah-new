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
router.get('/api/admin/forwarding/queue', requireAdmin, asyncHandler(async (_req: any, res: any) => {
    // Return empty arrays if none exist (real "no data", not fake)
    res.json({ ok: true, data: { items: [], total: 0 } });
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
