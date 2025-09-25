import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok, listResult } from "../../../src/lib/http";
import { requireAuth } from "../../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/invoices", requireAuth, asyncHandler(async (req: any, res: any) => {
    const userId = req.session!.user.id;
    
    const { rows } = await pool.query(
        `SELECT id, invoice_number, amount_pence, status, created_at
         FROM invoice
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId]
    );
    
    ok(res, listResult(rows)); // Always 200 with { items: [] } if empty
}));

export default router;
