import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok } from "../../../src/lib/http";
import { requireAdmin } from "../../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get billing metrics
router.get('/api/admin/billing/metrics', requireAdmin, asyncHandler(async (req: any, res: any) => {
    try {
        // Run independent queries; if any fails (e.g., missing table) fall back safely
        const [[revenueRow], [outstandingRow], [churnRow]] = await Promise.all([
            pool.query(`
                SELECT COALESCE(SUM(amount_pence), 0) AS monthly_revenue_pence
                FROM invoice
                WHERE created_at >= EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000 
                  AND status = 'paid'
            `).then(r => r.rows).catch(() => [{ monthly_revenue_pence: 0 }]),

            pool.query(`
                SELECT COALESCE(SUM(amount_pence), 0) AS outstanding_pence, 
                       COALESCE(COUNT(*), 0) AS pending_count
                FROM invoice
                WHERE status = 'pending'
            `).then(r => r.rows).catch(() => [{ outstanding_pence: 0, pending_count: 0 }]),

            // Churn rate - return 0 if not tracked
            Promise.resolve([{ churn_rate: 0 }])
        ]);

        ok(res, {
            monthly_revenue_pence: revenueRow?.monthly_revenue_pence ?? 0,
            outstanding_invoices_pence: outstandingRow?.outstanding_pence ?? 0,
            churn_rate: churnRow?.churn_rate ?? 0,
            recent_transactions: []
        });
    } catch (err) {
        console.error('[admin.billing.metrics] fatal', err);
        ok(res, {
            monthly_revenue_pence: 0,
            outstanding_invoices_pence: 0,
            churn_rate: 0,
            recent_transactions: []
        });
    }
}));

// Get recent transactions
router.get('/api/admin/transactions', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { limit = 20, offset = 0 } = req.query;

    try {
        const { rows } = await pool.query(`
            SELECT id, user_id, amount_pence, currency, status, created_at, description
            FROM invoice
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), parseInt(offset)]);

        ok(res, { transactions: rows });
    } catch (err) {
        console.error('[admin.transactions] error', err);
        ok(res, { transactions: [] });
    }
}));

export default router;
