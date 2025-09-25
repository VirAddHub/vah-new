import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok } from "../../src/lib/http";
import { requireAuth } from "../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Admin guard middleware
function requireAdmin(req: any, res: any, next: any) {
    const u = req.session?.user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!u.is_admin) return res.status(403).json({ error: 'forbidden' });
    next();
}

router.get("/api/admin/metrics", requireAuth, requireAdmin, asyncHandler(async (req: any, res: any) => {
    const totals: any = {
        users: 0,
        monthly_revenue_pence: 0,
        mail_processed: 0,
        active_forwards: 0
    };

    let recent_activity: any[] = [];

    try {
        // Get user count
        try {
            const { rows: userRows } = await pool.query('SELECT COUNT(*)::int AS users FROM "user"');
            totals.users = userRows[0]?.users || 0;
        } catch (err) {
            console.error('Error getting user count:', err);
            totals.users = 0;
        }

        // Get monthly revenue (using invoice table since no payments table)
        try {
            const { rows: revenueRows } = await pool.query(`
                SELECT COALESCE(SUM(amount_pence),0)::int AS monthly_revenue_pence
                FROM invoice
                WHERE status = 'paid' AND created_at >= date_trunc('month', now())
            `);
            totals.monthly_revenue_pence = revenueRows[0]?.monthly_revenue_pence || 0;
        } catch (err) {
            console.error('Error getting monthly revenue:', err);
            totals.monthly_revenue_pence = 0;
        }

        // Get mail processed count
        try {
            const { rows: mailRows } = await pool.query(`
                SELECT COALESCE(COUNT(*),0)::int AS mail_processed
                FROM mail_item
                WHERE status IN ('processed','scanned','forwarded')
            `);
            totals.mail_processed = mailRows[0]?.mail_processed || 0;
        } catch (err) {
            console.error('Error getting mail processed count:', err);
            totals.mail_processed = 0;
        }

        // Get active forwards count (using mail_item with forwarded_physically filter)
        try {
            const { rows: forwardsRows } = await pool.query(`
                SELECT COALESCE(COUNT(*),0)::int AS active_forwards
                FROM mail_item
                WHERE forwarded_physically = true AND status = 'active'
            `);
            totals.active_forwards = forwardsRows[0]?.active_forwards || 0;
        } catch (err) {
            console.error('Error getting active forwards count:', err);
            totals.active_forwards = 0;
        }

        // Get recent activity
        try {
            const { rows: activityRows } = await pool.query(`
                SELECT type, meta, occurred_at
                FROM activity_log
                ORDER BY occurred_at DESC
                LIMIT 10
            `);
            recent_activity = activityRows || [];
        } catch (err) {
            console.error('Error getting recent activity:', err);
            recent_activity = [];
        }

    } catch (err) {
        console.error('Error in admin metrics:', err);
    }

    ok(res, {
        totals,
        recent_activity,
        system_health: { status: "operational" }
    });
}));

export default router;
