// apps/backend/src/server/routes/admin-overview.ts
// Admin overview endpoint - single source of truth for dashboard metrics

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/admin/overview
 * Get comprehensive admin overview metrics (single source of truth)
 */
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
    try {
        const pool = getPool();

        // Pre-compute BIGINT epoch-ms bounds for index-friendly queries
        // Date.now() returns milliseconds, so subtract 30 days worth of milliseconds
        const thirtyDaysAgoMs = Math.floor(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const thisMonthStartMs = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime());
        const lastMonthStartMs = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime());

        // Execute all queries in parallel for performance
        const [
            usersTotalResult,
            usersActive30Result,
            usersKycPendResult,
            usersDeletedResult,
            mail30Result,
            forwardsActiveResult,
            revenueThisResult,
            revenueLastResult,
        ] = await Promise.all([
            // Total users (not deleted)
            pool.query(`SELECT COUNT(*)::int AS c FROM "user" u WHERE u.deleted_at IS NULL`),
            
            // Active users (logged in last 30 days) - last_login_at is BIGINT epoch-ms
            // Use COALESCE to count users who signed up but never logged in as "active" (based on created_at)
            pool.query(`
                SELECT COUNT(*)::int AS c
                FROM "user" u
                WHERE u.deleted_at IS NULL
                  AND COALESCE(u.last_login_at, u.created_at) >= $1
            `, [thirtyDaysAgoMs]),
            
            // KYC pending
            pool.query(`SELECT COUNT(*)::int AS c FROM "user" u WHERE u.deleted_at IS NULL AND u.kyc_status IN ('pending', 'reverify_required')`),
            
            // Deleted users
            pool.query(`SELECT COUNT(*)::int AS c FROM "user" u WHERE u.deleted_at IS NOT NULL`),
            
            // Mail items last 30 days (created_at is BIGINT epoch-ms) - use BIGINT comparison for index
            pool.query(`
                SELECT COUNT(*)::int AS c
                FROM mail_item m
                WHERE COALESCE(m.deleted, false) = false
                  AND m.created_at >= $1
            `, [thirtyDaysAgoMs]),
            
            // Active forwarding requests - use LOWER() for case-insensitive matching (consider adding functional index)
            pool.query(`SELECT COUNT(*)::int AS c FROM forwarding_request f WHERE LOWER(f.status) IN ('requested', 'reviewed', 'processing')`),
            
            // Revenue this month (from invoices - status='paid', created_at is BIGINT epoch-ms) - use BIGINT comparison
            pool.query(`
                SELECT COALESCE(SUM(amount_pence), 0)::bigint AS p
                FROM invoices i
                WHERE i.status = 'paid'
                  AND i.created_at >= $1
            `, [thisMonthStartMs]),
            
            // Revenue last month - use BIGINT comparisons
            pool.query(`
                SELECT COALESCE(SUM(amount_pence), 0)::bigint AS p
                FROM invoices i
                WHERE i.status = 'paid'
                  AND i.created_at >= $1
                  AND i.created_at < $2
            `, [lastMonthStartMs, thisMonthStartMs]),
        ]);

        const usersTotal = parseInt(usersTotalResult.rows[0]?.c || '0');
        const usersActive30 = parseInt(usersActive30Result.rows[0]?.c || '0');
        const usersKycPend = parseInt(usersKycPendResult.rows[0]?.c || '0');
        const usersDeleted = parseInt(usersDeletedResult.rows[0]?.c || '0');
        const mail30 = parseInt(mail30Result.rows[0]?.c || '0');
        const forwardsActive = parseInt(forwardsActiveResult.rows[0]?.c || '0');
        const revenueThis = parseInt(revenueThisResult.rows[0]?.p || '0');
        const revenueLast = parseInt(revenueLastResult.rows[0]?.p || '0');

        const delta = revenueLast === 0 ? null : ((revenueThis - revenueLast) / revenueLast) * 100;

        const links = {
            users: '/admin/users',
            active_users: '/admin/users?active=30',
            pending_kyc: '/admin/users?kyc=pending',
            revenue: '/admin/billing?range=this-month',
            mail: '/admin/mail?range=30d',
            forwards: '/admin/forwarding?status=requested,reviewed,processing',
        };

        res.json({
            ok: true,
            metrics: {
                totals: {
                    users: usersTotal,
                    active_users: usersActive30,
                    pending_kyc: usersKycPend,
                    deleted_users: usersDeleted,
                },
                mail: { last30d: mail30 },
                forwards: { active: forwardsActive },
                revenue: {
                    this_month_pence: revenueThis,
                    last_month_pence: revenueLast,
                    delta_pct: delta,
                },
            },
            links,
            generated_at: new Date().toISOString(),
        });
    } catch (e: any) {
        console.error('[GET /api/admin/overview] error:', e);
        res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});

export default router;

