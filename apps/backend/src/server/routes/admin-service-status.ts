// src/server/routes/admin-service-status.ts
// Service monitoring endpoints for Stripe, Sumsub, Postmark, OneDrive

import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/admin/service-status/stripe
 * Configuration and recent event activity. Does not call Stripe.
 */
router.get('/stripe', requireAdmin, async (_req: Request, res: Response) => {
    try {
        const configured = Boolean((process.env.STRIPE_SECRET_KEY || '').trim() && (process.env.STRIPE_WEBHOOK_SECRET || '').trim());
        const pool = getPool();
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const r = await pool.query(
            `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
               FROM webhook_log WHERE provider = 'stripe' AND received_at_ms > $1`, [since]);
        const { total, failed } = r.rows[0] || { total: 0, failed: 0 };
        return res.json({
            ok: true,
            status: !configured ? 'down' : failed > 0 ? 'degraded' : 'healthy',
            configured,
            message: !configured ? 'Stripe keys are not configured' : `Stripe events in the last 24 hours: ${total} received, ${failed} failed`,
        });
    } catch (error) {
        logger.error('[Service Status] Stripe check failed:', error);
        return res.status(500).json({ ok: false, status: 'down', message: 'Stripe status check failed' });
    }
});

/**
 * GET /api/admin/service-status/sumsub
 * Check Sumsub service status
 */
router.get('/sumsub', requireAdmin, async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);

        // Check recent webhook activity (Sumsub - check if it exists)
        const webhookResult = await pool.query(`
            SELECT 
                MAX(created_at) as last_webhook,
                COUNT(*) as total_events,
                COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_events,
                COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as error_count
            FROM webhook_log 
            WHERE (type = 'sumsub' OR source = 'sumsub') 
            AND created_at >= $2
        `, [oneHourAgo, oneDayAgo]);

        const webhookData = webhookResult.rows[0];
        const lastWebhook = webhookData?.last_webhook ? parseInt(webhookData.last_webhook) : null;
        const errorCount = parseInt(webhookData?.error_count || '0');
        const recentEvents = parseInt(webhookData?.recent_events || '0');

        // Determine status based on activity
        let status = 'healthy';
        if (!lastWebhook || (now - lastWebhook) > (2 * 60 * 60 * 1000)) {
            status = 'down';
        } else if (errorCount > 3 || recentEvents === 0) {
            status = 'degraded';
        }

        const uptime = errorCount === 0 ? 99.9 : Math.max(95, 99.9 - (errorCount * 0.5));

        res.json({
            ok: true,
            status,
            lastWebhook,
            errorCount,
            recentEvents,
            uptime,
            message: `Sumsub webhook activity: ${recentEvents} events in last hour`
        });

    } catch (error: any) {
        logger.error('[Service Status] Sumsub check failed:', error);
        res.status(500).json({
            ok: false,
            error: 'service_check_failed',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/service-status/postmark
 * Check Postmark service status
 */
router.get('/postmark', requireAdmin, async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);

        // Check recent webhook activity (Postmark - check if it exists)
        const webhookResult = await pool.query(`
            SELECT 
                MAX(created_at) as last_webhook,
                COUNT(*) as total_events,
                COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_events,
                COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as error_count
            FROM webhook_log 
            WHERE (type = 'postmark' OR source = 'postmark') 
            AND created_at >= $2
        `, [oneHourAgo, oneDayAgo]);

        const webhookData = webhookResult.rows[0];
        const lastWebhook = webhookData?.last_webhook ? parseInt(webhookData.last_webhook) : null;
        const errorCount = parseInt(webhookData?.error_count || '0');
        const recentEvents = parseInt(webhookData?.recent_events || '0');

        // Check email bounce rate
        const bounceResult = await pool.query(`
            SELECT COUNT(*) as bounce_count
            FROM "user" 
            WHERE email_bounced_at IS NOT NULL 
            AND email_bounced_at >= $1
        `, [oneDayAgo]);

        const bounceCount = parseInt(bounceResult.rows[0]?.bounce_count || '0');

        // Determine status
        let status = 'healthy';
        if (!lastWebhook || (now - lastWebhook) > (2 * 60 * 60 * 1000)) {
            status = 'down';
        } else if (errorCount > 10 || bounceCount > 20) {
            status = 'degraded';
        }

        const uptime = errorCount === 0 ? 99.9 : Math.max(95, 99.9 - (errorCount * 0.3));

        res.json({
            ok: true,
            status,
            lastWebhook,
            errorCount,
            recentEvents,
            bounceCount,
            uptime,
            message: `Postmark activity: ${recentEvents} events, ${bounceCount} bounces in last 24h`
        });

    } catch (error: any) {
        logger.error('[Service Status] Postmark check failed:', error);
        res.status(500).json({
            ok: false,
            error: 'service_check_failed',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/service-status/onedrive
 * Check OneDrive service status
 */
router.get('/onedrive', requireAdmin, async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);

        // Check recent webhook activity (OneDrive uses 'source' column)
        const webhookResult = await pool.query(`
            SELECT 
                MAX(created_at) as last_webhook,
                COUNT(*) as total_events,
                COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_events,
                COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as error_count
            FROM webhook_log 
            WHERE source = 'onedrive' 
            AND created_at >= $2
        `, [oneHourAgo, oneDayAgo]);

        const webhookData = webhookResult.rows[0];
        const lastWebhook = webhookData?.last_webhook ? parseInt(webhookData.last_webhook) : null;
        const errorCount = parseInt(webhookData?.error_count || '0');
        const recentEvents = parseInt(webhookData?.recent_events || '0');

        // Check recent mail items created
        const mailResult = await pool.query(`
            SELECT COUNT(*) as mail_count
            FROM mail_item 
            WHERE created_at >= $1
        `, [oneDayAgo]);

        const mailCount = parseInt(mailResult.rows[0]?.mail_count || '0');

        // Determine status
        let status = 'healthy';
        if (!lastWebhook || (now - lastWebhook) > (2 * 60 * 60 * 1000)) {
            status = 'down';
        } else if (errorCount > 5 || (recentEvents === 0 && mailCount === 0)) {
            status = 'degraded';
        }

        const uptime = errorCount === 0 ? 99.9 : Math.max(95, 99.9 - (errorCount * 0.5));

        res.json({
            ok: true,
            status,
            lastWebhook,
            errorCount,
            recentEvents,
            mailCount,
            uptime,
            message: `OneDrive activity: ${recentEvents} webhooks, ${mailCount} mail items in last 24h`
        });

    } catch (error: any) {
        logger.error('[Service Status] OneDrive check failed:', error);
        res.status(500).json({
            ok: false,
            error: 'service_check_failed',
            message: error.message
        });
    }
});

export default router;
