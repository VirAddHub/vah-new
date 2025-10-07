import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/trigger-migrate
 * Trigger database migrations (one-time use)
 */
router.get('/trigger-migrate', async (req: Request, res: Response) => {
    try {
        console.log('🚀 Triggering migrations via API...');
        
        // Import and run the startup migration
        const { runStartupMigrations } = require('../scripts/startup-migrate');
        await runStartupMigrations();
        
        res.json({
            ok: true,
            message: 'Migrations triggered successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        console.error('[Trigger Migrate] Error:', error);
        res.status(500).json({
            ok: false,
            error: 'Failed to trigger migrations',
            message: error.message
        });
    }
});

export default router;
