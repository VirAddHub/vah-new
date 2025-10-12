// src/server/routes/admin-service-status.ts
// Service monitoring endpoints for GoCardless, Sumsub, Postmark, OneDrive

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/admin/service-status/gocardless
 * Check GoCardless service status
 */
router.get('/gocardless', requireAdmin, async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneHourAgo = now - (60 * 60 * 1000);

        // Check recent webhook activity (GoCardless uses 'type' column)
        const webhookResult = await pool.query(`
            SELECT 
                MAX(created_at) as last_webhook,
                COUNT(*) as total_events,
                COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_events,
                COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as error_count
            FROM webhook_log 
            WHERE (type = 'gocardless' OR source = 'gocardless') 
            AND created_at >= $2
        `, [oneHourAgo, oneDayAgo]);

        const webhookData = webhookResult.rows[0];
        const lastWebhook = webhookData?.last_webhook ? parseInt(webhookData.last_webhook) : null;
        const errorCount = parseInt(webhookData?.error_count || '0');
        const recentEvents = parseInt(webhookData?.recent_events || '0');

        // Determine status based on activity
        let status = 'healthy';
        if (!lastWebhook || (now - lastWebhook) > (2 * 60 * 60 * 1000)) {
            status = 'down'; // No webhook in 2 hours
        } else if (errorCount > 5 || recentEvents === 0) {
            status = 'degraded'; // High error rate or no recent activity
        }

        // Calculate uptime (simplified)
        const uptime = errorCount === 0 ? 99.9 : Math.max(95, 99.9 - (errorCount * 0.5));

        res.json({
            ok: true,
            status,
            lastWebhook,
            errorCount,
            recentEvents,
            uptime,
            message: `GoCardless webhook activity: ${recentEvents} events in last hour`
        });

    } catch (error: any) {
        console.error('[Service Status] GoCardless check failed:', error);
        res.status(500).json({
            ok: false,
            error: 'service_check_failed',
            message: error.message
        });
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
        console.error('[Service Status] Sumsub check failed:', error);
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
        console.error('[Service Status] Postmark check failed:', error);
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
        console.error('[Service Status] OneDrive check failed:', error);
        res.status(500).json({
            ok: false,
            error: 'service_check_failed',
            message: error.message
        });
    }
});

export default router;
