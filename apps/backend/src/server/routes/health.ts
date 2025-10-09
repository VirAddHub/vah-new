// src/server/routes/health.ts
// Health check endpoint for monitoring and load balancers

import { Request, Response, Router } from 'express';
import { getPool } from '../db';
import os from 'os';

const router = Router();

/**
 * GET /api/health
 * Public health check endpoint (no auth required)
 * Returns service status, basic info, and database connectivity
 */
async function healthCheck(req: Request, res: Response) {
    try {
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

export { router as health };