// src/server/routes/health.ts
// Health check endpoint for monitoring and load balancers

import { Request, Response, Router } from 'express';
import { getPool } from '../db';
import { MAIL_STATUS, ALLOWED } from '../../modules/forwarding/mailStatus';
import os from 'os';

const router = Router();

/**
 * GET /api/health
 * Public health check endpoint (no auth required)
 * Returns service status, basic info, and database connectivity
 */
async function healthCheck(req: Request, res: Response) {
    try {
        // Add CORS headers for frontend access
        const origin = req.headers.origin as string;
        const allowedOrigins = [
            'https://vah-new-frontend-75d6.vercel.app',
            'https://vah-frontend-final.vercel.app',
            'http://localhost:3000'
        ];
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        const startTime = Date.now();

        // Basic service info
        const serviceInfo = {
            ok: true,
            service: 'vah-backend',
            status: 'healthy',
            time: new Date().toISOString(),
            pid: process.pid,
            host: os.hostname(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.BUILD_VERSION || null,
            commit: process.env.GIT_COMMIT || null,
            nodeEnv: process.env.NODE_ENV || 'development'
        };

        // Database connectivity check
        let dbStatus = 'unknown';
        let dbLatency = 0;

        try {
            const dbStart = Date.now();
            const pool = getPool();
            await pool.query('SELECT 1 as health_check');
            dbLatency = Date.now() - dbStart;
            dbStatus = 'up';
        } catch (dbError: any) {
            dbStatus = 'down';
            console.warn('[Health Check] Database check failed:', dbError.message);
        }

        const responseTime = Date.now() - startTime;

        // Determine overall health
        const overallStatus = dbStatus === 'up' ? 'healthy' : 'degraded';

        res.status(200).json({
            ...serviceInfo,
            status: overallStatus,
            checks: {
                database: {
                    status: dbStatus,
                    latency: dbLatency
                },
                responseTime
            }
        });

    } catch (error: any) {
        console.error('[Health Check] Error:', error);
        res.status(500).json({
            ok: false,
            service: 'vah-backend',
            status: 'unhealthy',
            time: new Date().toISOString(),
            error: error.message
        });
    }
}

/**
 * GET /api/healthz/status-guard
 * Status guard health check for forwarding hardening monitoring
 */
async function statusGuardHealthCheck(req: Request, res: Response) {
    try {
        const gitSha = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),

            // Feature flags
            flags: {
                STRICT_STATUS_GUARD: process.env.STRICT_STATUS_GUARD || '0',
                BFF_READS_ONLY: process.env.BFF_READS_ONLY || '0',
                PERF_OPTIMIZATIONS: process.env.PERF_OPTIMIZATIONS || '0'
            },

            // System info
            system: {
                gitSha,
                nodeVersion: process.version,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                hostname: os.hostname()
            },

            // Status guard configuration
            statusGuard: {
                enabled: process.env.STRICT_STATUS_GUARD === '1',
                canonicalStatuses: Object.values(MAIL_STATUS),
                allowedTransitions: Object.fromEntries(
                    Object.entries(ALLOWED).map(([from, to]) => [from, to])
                )
            },

            // BFF guard configuration
            bffGuard: {
                enabled: process.env.BFF_READS_ONLY === '1',
                blocksNonGet: process.env.BFF_READS_ONLY === '1'
            }
        };

        res.json(health);
    } catch (error: any) {
        console.error('[HEALTH] Status guard health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * GET /api/healthz/metrics
 * Detailed metrics health check
 */
async function metricsHealthCheck(req: Request, res: Response) {
    try {
        const { metrics } = require('../../lib/metrics');
        const summary = metrics.getSummary();

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),

            metrics: {
                totalStatusTransitions: (Object.values(summary.statusTransitions) as number[]).reduce((a, b) => a + b, 0),
                totalIllegalAttempts: (Object.values(summary.illegalTransitions) as number[]).reduce((a, b) => a + b, 0),
                totalApiErrors: (Object.values(summary.apiErrors) as number[]).reduce((a, b) => a + b, 0),

                // Breakdown by type
                statusTransitions: summary.statusTransitions,
                illegalTransitions: summary.illegalTransitions,
                apiErrors: summary.apiErrors
            },

            // Health indicators
            indicators: {
                hasRecentActivity: (Object.values(summary.statusTransitions) as number[]).some(count => count > 0),
                hasIllegalAttempts: (Object.values(summary.illegalTransitions) as number[]).some(count => count > 0),
                hasApiErrors: (Object.values(summary.apiErrors) as number[]).some(count => count > 0)
            }
        };

        res.json(health);
    } catch (error: any) {
        console.error('[HEALTH] Metrics health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Metrics health check failed',
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * GET /api/healthz
 * Kubernetes-style health check (minimal response)
 */
async function healthCheckMinimal(req: Request, res: Response) {
    try {
        const pool = getPool();
        await pool.query('SELECT 1');
        res.status(200).json({
            status: 'ok',
            version: '2.0.0-deployment-test',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(503).json({ status: 'error' });
    }
}

// Mount routes
router.get('/health', healthCheck);
router.get('/healthz', healthCheckMinimal);
router.get('/healthz/status-guard', statusGuardHealthCheck);
router.get('/healthz/metrics', metricsHealthCheck);

export { router as health };