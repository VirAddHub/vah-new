import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/webhook/migrate
 * Webhook endpoint to trigger migrations
 * Body: { trigger: "migrate" }
 */
router.post('/webhook/migrate', async (req: Request, res: Response) => {
    try {
        const { trigger } = req.body;

        if (trigger !== 'migrate') {
            return res.status(400).json({
                ok: false,
                error: 'Invalid trigger'
            });
        }

        console.log('🚀 Webhook triggered migrations...');

        // Import and run the startup migration
        const { runStartupMigrations } = require('../scripts/startup-migrate');
        await runStartupMigrations();

        res.json({
            ok: true,
            message: 'Migrations completed successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Webhook Migrate] Error:', error);
        res.status(500).json({
            ok: false,
            error: 'Failed to run migrations',
            message: error.message
        });
    }
});

export default router;
