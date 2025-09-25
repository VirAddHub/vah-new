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
router.get('/api/admin/analytics', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { range = '30d', period = 'rolling' } = req.query;

    if (!['7d', '30d', '90d', 'MTD', 'YTD'].includes(range)) {
        return badRequest(res, 'range must be one of: 7d, 30d, 90d, MTD, YTD');
    }

    if (!['rolling', 'calendar'].includes(period)) {
        return badRequest(res, 'period must be one of: rolling, calendar');
    }

    let days;
    if (range === 'MTD') {
        // Month to date
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        days = Math.ceil((now.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
    } else if (range === 'YTD') {
        // Year to date
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), 0, 1);
        days = Math.ceil((now.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
    } else {
        days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
        // Run all queries in parallel
        const [usersResult, revenueResult, mailResult, plansResult] = await Promise.all([
            // Users over time
            pool.query(`
                SELECT 
                    to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD') as d,
                    COUNT(*) as count
                FROM "user"
                WHERE created_at >= $1
                GROUP BY to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD')
                ORDER BY d
            `, [Math.floor(cutoffDate.getTime())]).then(r => r.rows).catch(() => []),

            // Revenue over time
            pool.query(`
                SELECT 
                    to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD') as d,
                    COALESCE(SUM(amount_pence), 0) as sum
                FROM invoice
                WHERE created_at >= $1 AND status = 'paid'
                GROUP BY to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD')
                ORDER BY d
            `, [Math.floor(cutoffDate.getTime())]).then(r => r.rows).catch(() => []),

            // Mail volume over time
            pool.query(`
                SELECT 
                    to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD') as d,
                    COUNT(*) as count
                FROM mail_item
                WHERE created_at >= $1
                GROUP BY to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD')
                ORDER BY d
            `, [Math.floor(cutoffDate.getTime())]).then(r => r.rows).catch(() => []),

            // Plans distribution
            pool.query(`
                SELECT 
                    COALESCE(plan_status, 'inactive') as plan,
                    COUNT(*) as count
                FROM "user"
                GROUP BY plan_status
                ORDER BY count DESC
            `).then(r => r.rows).catch(() => [])
        ]);

        ok(res, {
            users_timeseries: usersResult,
            revenue_timeseries_pence: revenueResult,
            mail_timeseries: mailResult,
            plan_distribution: plansResult
        });
    } catch (err) {
        console.error('[admin.analytics] error', err);
        ok(res, {
            users_timeseries: [],
            revenue_timeseries_pence: [],
            mail_timeseries: [],
            plan_distribution: []
        });
    }
}));

export default router;
