import { Router } from "express";
import { Pool } from "pg";

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

router.get('/', requireAdmin, async (req: any, res: any) => {
    try {
        // Run independent queries; if any fails (e.g., missing table) fall back safely
        const [[usersRow], [revRow], [mailRow], [fwdRow]] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS users FROM "user";').then(r => r.rows).catch(() => [{ users: 0 }]),
            pool.query(`
                SELECT COALESCE(SUM(amount_pence),0)::int AS monthly_revenue_pence
                FROM invoice
                WHERE status = 'paid' AND created_at >= date_trunc('month', now());
            `).then(r => r.rows).catch(() => [{ monthly_revenue_pence: 0 }]),
            pool.query(`
                SELECT COALESCE(COUNT(*),0)::int AS mail_processed
                FROM mail_item
                WHERE status IN ('processed','scanned','forwarded');
            `).then(r => r.rows).catch(() => [{ mail_processed: 0 }]),
            pool.query(`
                SELECT COALESCE(COUNT(*),0)::int AS active_forwards
                FROM mail_item
                WHERE forwarded_physically = true AND status = 'active';
            `).then(r => r.rows).catch(() => [{ active_forwards: 0 }]),
        ]);

        const recent_activity =
            await pool.query(
                `SELECT type, meta, occurred_at
                 FROM activity_log
                 ORDER BY occurred_at DESC
                 LIMIT 10;`
            ).then(r => r.rows).catch(() => []);

        res.json({
            totals: {
                users: usersRow?.users ?? 0,
                monthly_revenue_pence: revRow?.monthly_revenue_pence ?? 0,
                mail_processed: mailRow?.mail_processed ?? 0,
                active_forwards: fwdRow?.active_forwards ?? 0,
            },
            recent_activity,
            system_health: { status: 'operational' },
        });
    } catch (err) {
        console.error('[admin.metrics] fatal', err);
        res.status(500).json({ error: 'server_error' });
    }
});

export default router;
