// src/server/routes/payments.ts
// Payment and subscription management endpoints

import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getPool } from '../db';
import { pricingService } from '../services/pricing';
import { param } from '../../lib/express-params';
import { ensureUserPlanLinked } from '../services/plan-linking';
import { upsertSubscriptionForUser } from '../services/subscription-linking';
import { sendPlanCancelled, buildAppUrl, sendWelcomeKycEmail } from '../../lib/mailer';
import { logger } from '../../lib/logger';
import { safeErrorMessage } from '../../lib/safeError';
import { getBillingProvider } from '../../config/billing';
import { stripeCheckoutCreateLimiter } from '../../lib/sensitiveRouteRateLimits';
import { createStripeCheckoutSession } from './stripe-checkout';

const router = Router();

/** Cancels / reactivates affect email + DB — keep low enough to deter scripted churn. */
const paymentsSubscriptionWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as { user?: { id?: number } }).user;
        return u?.id != null ? `payments:subscription-write:${u.id}` : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res) => {
        res.setHeader('Retry-After', '900');
        return res.status(429).json({ ok: false, error: 'rate_limited' });
    },
});

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/payments/subscriptions/status
 * Get subscription status for current user
 */
router.get('/subscriptions/status', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                u.plan_status,
                u.gocardless_customer_id,
                u.gocardless_mandate_id,
                u.stripe_customer_id,
                p.name as plan_name,
                p.billing_interval as billing_cycle,
                p.price_pence
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];

        // Get last payment date
        const lastPaymentResult = await pool.query(`
            SELECT period_end
            FROM invoices
            WHERE user_id = $1 AND status = 'paid'
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        const lastPayment = lastPaymentResult.rows[0];
        let nextPaymentDate: string | null = null;

        if (lastPayment && lastPayment.period_end) {
            const periodEnd = new Date(lastPayment.period_end);
            nextPaymentDate = new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        const hasPaymentMethod = !!(user.gocardless_mandate_id || user.stripe_customer_id);
        return res.json({
            ok: true,
            data: {
                plan_status: user.plan_status || 'inactive',
                plan_name: user.plan_name || null,
                billing_cycle: user.billing_cycle || 'monthly',
                next_payment_date: nextPaymentDate,
                price_pence: user.price_pence || 0,
                has_payment_method: hasPaymentMethod
            }
        });
    } catch (error: any) {
        console.error('[GET /api/payments/subscriptions/status] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/payments/subscriptions
 * Manage subscription (cancel, reactivate)
 */
router.post('/subscriptions', requireAuth, paymentsSubscriptionWriteLimiter, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { action } = req.body;
    const pool = getPool();

    if (!action || !['cancel', 'reactivate'].includes(action)) {
        return res.status(400).json({ ok: false, error: 'invalid_action' });
    }

    try {
        const newStatus = action === 'cancel' ? 'cancelled' : 'active';

        // NOTE: plan_status is only updated via GoCardless webhooks when subscription.status transitions to 'active'
        // Do not update plan_status here - it will be updated by webhook handlers
        await pool.query(`
            UPDATE "user"
            SET updated_at = $1
            WHERE id = $2
        `, [Date.now(), userId]);

        // Send plan cancelled email if cancelling (non-blocking)
        if (action === 'cancel') {
            try {
                const userResult = await pool.query('SELECT email, first_name, name FROM "user" WHERE id = $1', [userId]);
                const user = userResult.rows[0];
                if (user?.email) {
                    // Calculate end date (end of current billing period)
                    const subscriptionResult = await pool.query(
                        `SELECT period_end FROM subscription WHERE user_id = $1 LIMIT 1`,
                        [userId]
                    );
                    const endDate = subscriptionResult.rows[0]?.period_end
                        ? new Date(subscriptionResult.rows[0].period_end).toLocaleDateString('en-GB')
                        : undefined;

                    sendPlanCancelled({
                        email: user.email,
                        firstName: user.first_name,
                        name: user.name,
                        end_date: endDate,
                        cta_url: buildAppUrl('/billing'),
                    }).catch((err) => {
                        console.error('[POST /api/payments/subscriptions] plan_cancelled_email_failed_nonfatal', err);
                    });
                }
            } catch (emailError) {
                // Don't fail cancellation if email fails
                console.error('[POST /api/payments/subscriptions] plan_cancelled_email_error', emailError);
            }
        }

        // TODO: Also cancel/reactivate the mandate in GoCardless API

        return res.json({ ok: true, status: newStatus });
    } catch (error: any) {
        console.error('[POST /api/payments/subscriptions] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/payments/redirect-flows
 * Create Stripe Checkout Session
 */
router.post('/redirect-flows', requireAuth, stripeCheckoutCreateLimiter, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const sub = await pool.query(
            `SELECT status, stripe_subscription_id FROM subscription WHERE user_id = $1`,
            [userId]
        );
        const subStatus = sub.rows[0]?.status ?? null;
        const hasStripeSub = !!sub.rows[0]?.stripe_subscription_id;
        if (hasStripeSub && subStatus === 'active') {
            return res.json({ ok: true, data: { alreadyLinked: true } });
        }
        try {
            const body = {
                plan_id: (req.body as any)?.plan_id ?? (req.body as any)?.planId,
                billing_period: (req.body as any)?.billing_period ?? (req.body as any)?.billingPeriod ?? 'monthly',
                success_url: (req.body as any)?.success_url,
                cancel_url: (req.body as any)?.cancel_url,
            };
            const { url } = await createStripeCheckoutSession(Number(userId), body);
            return res.json({
                ok: true,
                data: { redirect_url: url },
                redirect_url: url,
            });
        } catch (e: any) {
            const msg = (e && e.message) || 'checkout_failed';
            if (msg === 'stripe_not_configured') return res.status(503).json({ ok: false, error: msg });
            if (msg === 'missing_price' || msg === 'plan_required' || msg === 'user_email_required') {
                return res.status(400).json({ ok: false, error: msg });
            }
            if (msg === 'user_not_found') return res.status(404).json({ ok: false, error: msg });
            return res.status(500).json({ ok: false, error: 'checkout_failed' });
        }
    } catch (err: any) {
        console.error('[Stripe] redirect-flows failed', {
            message: safeErrorMessage(err),
            name: err?.name,
        });
        const msg = String(err?.message || '');
        const isDb = msg.toLowerCase().includes('database') || msg.toLowerCase().includes('postgres');
        return res.status(isDb ? 500 : 400).json({
            ok: false,
            error: isDb ? 'database_error' : 'payment_setup_failed',
            message: isDb ? 'Database error' : 'Payment setup could not be started. Please try again.',
        });
    }
});

export default router;
