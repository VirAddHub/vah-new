import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok, badRequest } from "../../../src/lib/http";
import { requireAdmin } from "../../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get analytics data
router.get('/api/admin/analytics', requireAdmin, asyncHandler(async (_req: any, res: any) => {
    // Until you have tracking tables, compute from existing tables or return legit zeros/empty arrays
    res.json({
        ok: true,
        data: {
            users_timeseries: [],
            revenue_timeseries_pence: [],
            mail_timeseries: [],
            plan_distribution: []
        }
    });
}));

export default router;
