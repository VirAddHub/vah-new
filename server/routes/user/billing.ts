import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok } from "../../../src/lib/http";
import { requireAuth } from "../../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/billing", requireAuth, asyncHandler(async (req: any, res: any) => {
    const userId = req.session!.user.id;

    // Get user's current plan
    const { rows: userRows } = await pool.query(
        `SELECT plan_status, plan_start_date
         FROM "user"
         WHERE id = $1`,
        [userId]
    );

    // Get recent invoices
    const { rows: invoiceRows } = await pool.query(
        `SELECT id, invoice_number, amount_pence, status, created_at
         FROM invoice
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
    );

    const user = userRows[0];
    ok(res, {
        subscription: {
            status: user?.plan_status ?? 'inactive',
            plan_start_date: user?.plan_start_date ?? null
        },
        invoices: invoiceRows ?? [] // Safe empty array
    });
}));

export default router;
