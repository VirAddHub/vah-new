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
router.get('/api/admin/billing/metrics', requireAdmin, asyncHandler(async (_req: any, res: any) => {
    // Without GoCardless hooked: return real zeros (not fake)
    res.json({
        ok: true,
        data: {
            monthly_revenue_pence: 0,
            invoices_outstanding: 0,
            churn_rate_pct: 0,
            mrr_pence: 0,
            arpu_pence: 0
        }
    });
}));

// Get recent transactions
router.get('/api/admin/transactions', requireAdmin, asyncHandler(async (_req: any, res: any) => {
    res.json({ ok: true, data: { items: [], total: 0 } });
}));

export default router;
