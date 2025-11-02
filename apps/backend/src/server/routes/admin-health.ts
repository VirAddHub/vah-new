// apps/backend/src/server/routes/admin-health.ts
// Admin health check endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

type Severity = 'ok' | 'degraded' | 'down';

function rollupSeverity(items: { severity: Severity }[]): Severity {
    if (items.some(i => i.severity === 'down')) return 'down';
    if (items.some(i => i.severity === 'degraded')) return 'degraded';
    return 'ok';
}

const withTimeout = <T,>(p: Promise<T>, ms = 2500): Promise<T> =>
    Promise.race([
        p,
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
    ]);

async function checkDB(): Promise<{ severity: Severity; details: any }> {
    try {
        const pool = getPool();
        const t0 = Date.now();
        await pool.query('SELECT 1');
        const ms = Date.now() - t0;
        return { severity: ms > 500 ? 'degraded' : 'ok', details: { latency_ms: ms } };
    } catch (e: any) {
        return { severity: 'down', details: { error: String(e?.message || e) } };
    }
}

async function checkService(name: string, fn: () => Promise<boolean>): Promise<{ name: string; severity: Severity; details: any }> {
    try {
        const ok = await withTimeout(fn(), 2500);
        return { name, severity: ok ? 'ok' : 'down', details: {} };
    } catch (e: any) {
        return { name, severity: 'down', details: { error: String(e?.message || e) } };
    }
}

// Simple cached response (60s)
let cache: any = null;
let cacheAt = 0;

/**
 * GET /api/admin/health/summary
 * Get overall system health summary (cached 60s)
 */
router.get('/summary', requireAdmin, async (_req: Request, res: Response) => {
    try {
        const now = Date.now();
        if (cache && now - cacheAt < 60_000) {
            return res.json(cache);
        }

        const dbStatus = await checkDB();

        // Check external services (stub implementations - replace with real SDK pings)
        const deps = await Promise.all([
            checkService('email_postmark', async () => {
                // TODO: Replace with actual Postmark health check
                // For now, check if env var exists
                return !!process.env.POSTMARK_TOKEN;
            }),
            checkService('payments_gocardless', async () => {
                // TODO: Replace with actual GoCardless health check
                return !!process.env.GOCARDLESS_ACCESS_TOKEN;
            }),
            checkService('kyc_sumsub', async () => {
                // TODO: Replace with actual Sumsub health check
                return !!process.env.SUMSUB_API_KEY;
            }),
            checkService('storage_onedrive', async () => {
                // TODO: Replace with actual OneDrive/Graph health check
                return !!(process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET);
            }),
            checkService('queue_jobs', async () => {
                // TODO: Replace with actual job queue health check
                // For now, just check DB is accessible (jobs likely use DB)
                return dbStatus.severity !== 'down';
            }),
        ]);

        const severity = rollupSeverity([dbStatus, ...deps]);
        cache = {
            ok: severity === 'ok',
            severity,
            checked_at: new Date().toISOString(),
            db: dbStatus,
            dependencies: deps
        };
        cacheAt = now;
        res.json(cache);
    } catch (e: any) {
        res.status(500).json({ ok: false, severity: 'down', error: String(e?.message || e) });
    }
});

/**
 * GET /api/admin/health/dependencies
 * Get detailed dependency health (no cache)
 */
router.get('/dependencies', requireAdmin, async (_req: Request, res: Response) => {
    try {
        const dbStatus = await checkDB();

        const deps = await Promise.all([
            checkService('email_postmark', async () => !!process.env.POSTMARK_TOKEN),
            checkService('payments_gocardless', async () => !!process.env.GOCARDLESS_ACCESS_TOKEN),
            checkService('kyc_sumsub', async () => !!process.env.SUMSUB_API_KEY),
            checkService('storage_onedrive', async () => !!(process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET)),
            checkService('queue_jobs', async () => dbStatus.severity !== 'down'),
        ]);

        res.json({
            db: dbStatus,
            dependencies: deps,
            severity: rollupSeverity([dbStatus, ...deps]),
            checked_at: new Date().toISOString(),
        });
    } catch (e: any) {
        res.status(500).json({ severity: 'down', error: String(e?.message || e) });
    }
});

export default router;

