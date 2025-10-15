// src/server/routes/admin-metrics-growth.ts
// Admin growth metrics endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/admin/metrics/growth
 * Get growth-focused metrics for admin dashboard
 */
router.get('/metrics/growth', requireAdmin, async (req: Request, res: Response) => {
    try {
        const db = getPool();
        const windowDays = Math.max(7, Math.min(180, parseInt(String(req.query.window ?? "60"), 10) || 60));

        // Daily signups
        const dailySignups = await db.query<{
            day: string; 
            signups: number;
        }>(`
            SELECT (date_trunc('day', to_timestamp(created_at/1000)))::date AS day,
                   COUNT(*)::int AS signups
            FROM "user"
            WHERE to_timestamp(created_at/1000) >= NOW() - ($1::int || ' days')::interval
            GROUP BY 1
            ORDER BY 1 ASC;
        `, [windowDays]);

        // Active paying users (plan_status = 'active')
        const activePaying = await db.query<{ active_paying: number }>(`
            SELECT COUNT(*)::int AS active_paying
            FROM "user"
            WHERE plan_status = 'active';
        `);

        // Mail received (daily)
        const dailyMail = await db.query<{ day: string; items: number }>(`
            SELECT (date_trunc('day', to_timestamp(created_at/1000)))::date AS day,
                   COUNT(*)::int AS items
            FROM mail_item
            WHERE to_timestamp(created_at/1000) >= NOW() - ($1::int || ' days')::interval
            GROUP BY 1
            ORDER BY 1 ASC;
        `, [windowDays]);

        // Forwarding requests (daily)
        const dailyFwd = await db.query<{ day: string; requests: number }>(`
            SELECT (date_trunc('day', to_timestamp(created_at/1000)))::date AS day,
                   COUNT(*)::int AS requests
            FROM forwarding_request
            WHERE to_timestamp(created_at/1000) >= NOW() - ($1::int || ' days')::interval
            GROUP BY 1
            ORDER BY 1 ASC;
        `, [windowDays]);

        // Scan SLA: % scanned within 24h over the last 30 days
        const sla = await db.query<{ within_24h: number; total: number }>(`
            WITH recent AS (
                SELECT created_at, scanned_at
                FROM mail_item
                WHERE to_timestamp(created_at/1000) >= NOW() - interval '30 days'
                  AND scanned_at IS NOT NULL
            )
            SELECT
                SUM(CASE WHEN (to_timestamp(scanned_at/1000) - to_timestamp(created_at/1000)) <= interval '24 hours' THEN 1 ELSE 0 END)::int AS within_24h,
                COUNT(*)::int AS total
            FROM recent;
        `);

        // Stale mail (>14 days, not forward_requested, not deleted)
        const stale = await db.query<{ stale_count: number }>(`
            SELECT COUNT(*)::int AS stale_count
            FROM mail_item
            WHERE deleted = false
              AND (status IS NULL OR status NOT IN ('forward_requested','deleted'))
              AND to_timestamp(created_at/1000) <= NOW() - interval '14 days';
        `);

        return res.json({
            ok: true,
            data: {
                window_days: windowDays,
                kpis: {
                    active_paying: activePaying.rows[0]?.active_paying ?? 0,
                    scan_sla_24h_pct: ((): number => {
                        const w = sla.rows[0]?.within_24h ?? 0;
                        const t = sla.rows[0]?.total ?? 0;
                        return t > 0 ? Math.round((w / t) * 10000) / 100 : 0;
                    })(),
                    stale_mail_over_14d: stale.rows[0]?.stale_count ?? 0,
                },
                series: {
                    daily_signups: dailySignups.rows,         // [{ day, signups }]
                    daily_mail_received: dailyMail.rows,      // [{ day, items }]
                    daily_forwarding_requests: dailyFwd.rows, // [{ day, requests }]
                }
            }
        });
    } catch (err: any) {
        console.error("[metrics_growth]", err);
        return res.status(500).json({ ok: false, error: "metrics_growth_failed" });
    }
});

export default router;
