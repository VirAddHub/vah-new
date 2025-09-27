import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok, listResult } from "../../src/lib/http";
import { requireAuth } from "../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/forwarding-requests", requireAuth, asyncHandler(async (req: any, res: any) => {
    const userId = req.session!.user.id;

    try {
        const { rows } = await pool.query(`
            SELECT id, status, forwarded_physically, forward_reason, 
                   forwarded_date, tracking_number, created_at, updated_at
            FROM mail_item
            WHERE user_id = $1 AND forwarded_physically = true
            ORDER BY created_at DESC
            LIMIT 100
        `, [userId]);

        ok(res, listResult(rows)); // Always 200 with { items: [] } if empty
    } catch (err) {
        console.error('Error getting forwarding requests:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}));

export default router;
