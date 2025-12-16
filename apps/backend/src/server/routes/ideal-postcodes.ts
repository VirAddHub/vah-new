// apps/backend/src/server/routes/ideal-postcodes.ts
// Ideal Postcodes API key endpoint

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/ideal-postcodes-key
 * Get Ideal Postcodes API key for frontend
 */
router.get('/ideal-postcodes-key', (_req: Request, res: Response) => {
    // Always return 200. Never 500 if not configured.
    const key = process.env.IDEAL_POSTCODES_API_KEY || null;
    return res.json({ ok: true, key });
});

export default router;
