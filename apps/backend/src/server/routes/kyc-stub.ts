// Safe stubs for KYC integration until Sumsub is wired
import { Router, Request, Response } from 'express';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/kyc/status
 * Get KYC verification status
 * Always returns not_started until Sumsub is configured
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
    return res.json({
        ok: true,
        data: {
            status: 'not_started',
            message: 'KYC verification will be available once Sumsub is connected'
        }
    });
});

/**
 * POST /api/kyc/start
 * Start KYC verification process
 * Returns 501 until Sumsub is configured
 */
router.post('/start', requireAuth, async (req: Request, res: Response) => {
    return res.status(501).json({
        ok: false,
        error: 'Sumsub not configured',
        code: 'SUMSUB_NOT_CONFIGURED',
        message: 'KYC verification will be available once Sumsub is connected'
    });
});

/**
 * POST /api/kyc/upload
 * Upload KYC documents
 * Returns 501 until Sumsub is configured
 */
router.post('/upload', requireAuth, async (req: Request, res: Response) => {
    return res.status(501).json({
        ok: false,
        error: 'Sumsub not configured',
        code: 'SUMSUB_NOT_CONFIGURED',
        message: 'Document upload will be available once Sumsub is connected'
    });
});

export default router;
