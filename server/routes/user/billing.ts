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
    
    // Get current subscription
    const { rows: subscriptionRows } = await pool.query(
        `SELECT s.id, s.status, s.current_period_end, p.name as plan_name, p.price_cents, p.currency
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.user_id = $1
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [userId]
    );

    // Get recent invoices
    const { rows: invoiceRows } = await pool.query(
        `SELECT id, invoice_number, total_pence, status, issued_at
         FROM invoices
         WHERE user_id = $1
         ORDER BY issued_at DESC
         LIMIT 10`,
        [userId]
    );

    ok(res, {
        subscription: subscriptionRows[0] ?? null,
        invoices: invoiceRows ?? [] // Safe empty array
    });
}));

export default router;
