// apps/backend/src/server/routes/ideal-postcodes.ts
// Ideal Postcodes API key endpoint

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/require-auth';

const router = Router();

/**
 * GET /api/ideal-postcodes-key
 * Get Ideal Postcodes API key for frontend
 */
router.get('/ideal-postcodes-key', requireAuth, async (req: Request, res: Response) => {
    try {
        const apiKey = process.env.IDEAL_POSTCODES_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                ok: false,
                error: 'API key not configured'
            });
        }

        return res.json({
            ok: true,
            apiKey: apiKey
        });
    } catch (error: any) {
        console.error('[GET /api/ideal-postcodes-key] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'Failed to get API key'
        });
    }
});

export default router;
