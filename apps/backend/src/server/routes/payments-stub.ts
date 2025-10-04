// Safe stubs for payments integration until GoCardless is wired
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
 * POST /api/payments/redirect-flows
 * Create GoCardless redirect flow for payment setup
 * Returns 501 until GoCardless is configured
 */
router.post('/redirect-flows', requireAuth, async (req: Request, res: Response) => {
    return res.status(501).json({
        ok: false,
        error: 'GoCardless not configured',
        code: 'GOCARDLESS_NOT_CONFIGURED',
        message: 'Payment setup will be available once GoCardless is connected'
    });
});

/**
 * POST /api/payments/subscriptions
 * Manage subscription (cancel, reactivate)
 * Returns 501 until GoCardless is configured
 */
router.post('/subscriptions', requireAuth, async (req: Request, res: Response) => {
    return res.status(501).json({
        ok: false,
        error: 'GoCardless not configured',
        code: 'GOCARDLESS_NOT_CONFIGURED',
        message: 'Subscription management will be available once GoCardless is connected'
    });
});

/**
 * GET /api/capabilities
 * Return current integration capabilities
 */
router.get('/capabilities', (req: Request, res: Response) => {
    res.json({
        ok: true,
        data: {
            gocardless: !!process.env.GOCARDLESS_ACCESS_TOKEN,
            sumsub: !!process.env.SUMSUB_TOKEN,
        }
    });
});

export default router;
