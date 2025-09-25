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

router.get("/api/mail-items", requireAuth, asyncHandler(async (req: any, res: any) => {
    const userId = req.session!.user.id;
    
    try {
        const { rows } = await pool.query(`
            SELECT id, subject, sender_name, received_date, status, 
                   forwarded_physically, scanned, tag, created_at, updated_at
            FROM mail_item
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 100
        `, [userId]);

        ok(res, listResult(rows)); // Always 200 with { items: [] } if empty
    } catch (err) {
        console.error('Error getting mail items:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}));

export default router;
