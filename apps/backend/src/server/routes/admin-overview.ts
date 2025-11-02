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
            
            // Active users (logged in last 30 days) - handles BIGINT or TIMESTAMP last_login_at
            pool.query(`
                SELECT COUNT(*)::int AS c
                FROM "user" u
                WHERE u.deleted_at IS NULL
                  AND (
                    CASE 
                      WHEN pg_typeof(u.last_login_at) = 'bigint'::regtype 
                        THEN to_timestamp((u.last_login_at)/1000.0)
                      ELSE (u.last_login_at)::timestamptz
                    END
                  ) >= date_trunc('day', now() - interval '30 days')
            `),
            
            // KYC pending
            pool.query(`SELECT COUNT(*)::int AS c FROM "user" u WHERE u.deleted_at IS NULL AND u.kyc_status IN ('pending', 'reverify_required')`),
            
            // Deleted users
            pool.query(`SELECT COUNT(*)::int AS c FROM "user" u WHERE u.deleted_at IS NOT NULL`),
            
            // Mail items last 30 days (created_at is BIGINT epoch-ms)
            pool.query(`
                SELECT COUNT(*)::int AS c
                FROM mail_item m
                WHERE COALESCE(m.deleted, false) = false
                  AND to_timestamp(m.created_at/1000.0) >= date_trunc('day', now() - interval '30 days')
            `),
            
            // Active forwarding requests (status values may be lowercase)
            pool.query(`SELECT COUNT(*)::int AS c FROM forwarding_request f WHERE LOWER(f.status) IN ('requested', 'reviewed', 'processing')`),
            
            // Revenue this month (from invoices - status='paid', created_at is BIGINT epoch-ms)
            pool.query(`
                SELECT COALESCE(SUM(amount_pence), 0)::bigint AS p
                FROM invoices i
                WHERE i.status = 'paid'
                  AND to_timestamp(i.created_at/1000.0) >= date_trunc('month', now())
            `),
            
            // Revenue last month
            pool.query(`
                SELECT COALESCE(SUM(amount_pence), 0)::bigint AS p
                FROM invoices i
                WHERE i.status = 'paid'
                  AND to_timestamp(i.created_at/1000.0) >= date_trunc('month', now() - interval '1 month')
                  AND to_timestamp(i.created_at/1000.0) < date_trunc('month', now())
            `),
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

