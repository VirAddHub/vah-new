// src/server/routes/payments.ts
// Payment and subscription management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { pricingService } from '../services/pricing';
import { gcCreateBrfUrl, gcCompleteFlow } from '../../lib/gocardless';
import { ensureUserPlanLinked } from '../services/plan-linking';
import { upsertSubscriptionForUser } from '../services/subscription-linking';

const router = Router();

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

        return res.json({
            ok: true,
            data: {
                plan_status: user.plan_status || 'inactive',
                plan_name: user.plan_name || null,
                billing_cycle: user.billing_cycle || 'monthly',
                next_payment_date: nextPaymentDate,
                price_pence: user.price_pence || 0,
                has_payment_method: !!user.gocardless_mandate_id
            }
        });
    } catch (error: any) {
        console.error('[GET /api/payments/subscriptions/status] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/payments/subscriptions
 * Manage subscription (cancel, reactivate)
 */
router.post('/subscriptions', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { action } = req.body;
    const pool = getPool();

    if (!action || !['cancel', 'reactivate'].includes(action)) {
        return res.status(400).json({ ok: false, error: 'invalid_action' });
    }

    try {
        const newStatus = action === 'cancel' ? 'cancelled' : 'active';

        await pool.query(`
            UPDATE "user"
            SET plan_status = $1, updated_at = $2
            WHERE id = $3
        `, [newStatus, Date.now(), userId]);

        // TODO: Also cancel/reactivate the mandate in GoCardless API

        return res.json({ ok: true, status: newStatus });
    } catch (error: any) {
        console.error('[POST /api/payments/subscriptions] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/payments/redirect-flows
 * Create GoCardless Billing Request Flow (BRF) authorisation URL for mandate setup
 */
router.post('/redirect-flows', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // Get user info
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];

        // Persist the selected plan before redirecting to GoCardless.
        // This prevents "active + no plan" later and avoids UI inference.
        // In LIVE, we must not silently default.
        const env = String(process.env.GC_ENVIRONMENT ?? process.env.GOCARDLESS_ENV ?? "sandbox")
            .trim()
            .toLowerCase();
        const isSandbox = env !== "live";

        const bodyPlanIdRaw = (req.body as any)?.plan_id ?? (req.body as any)?.planId;
        const billingPeriodRaw = String((req.body as any)?.billing_period ?? (req.body as any)?.billingPeriod ?? "")
            .trim()
            .toLowerCase();
        const cadence: "monthly" | "annual" =
            billingPeriodRaw === "annual" || billingPeriodRaw === "year" ? "annual" : "monthly";

        let chosenPlanId: number | null = null;
        if (typeof bodyPlanIdRaw === "number" || (typeof bodyPlanIdRaw === "string" && bodyPlanIdRaw.trim() && bodyPlanIdRaw !== "default")) {
            const n = Number(bodyPlanIdRaw);
            if (!Number.isNaN(n) && n > 0) chosenPlanId = n;
        }

        if (!chosenPlanId && !isSandbox) {
            return res.status(400).json({
                ok: false,
                error: "plan_required",
                message: "A plan must be selected before starting payment setup.",
            });
        }

        // If sandbox and no explicit plan id, default to monthly plan slug resolution later.
        if (chosenPlanId) {
            // Verify and set user.plan_id immediately
            const p = await pool.query(`SELECT id FROM plans WHERE id = $1 AND active = true AND retired_at IS NULL LIMIT 1`, [chosenPlanId]);
            if (p.rows.length === 0) {
                return res.status(400).json({ ok: false, error: "invalid_plan_id" });
            }
            await pool.query(
                `UPDATE "user" SET plan_id = $1, updated_at = $2 WHERE id = $3`,
                [chosenPlanId, Date.now(), userId]
            );
        } else if (isSandbox) {
            // Default to monthly/annual plan by interval
            const interval = cadence === "annual" ? "year" : "month";
            const p = await pool.query(
                `SELECT id FROM plans WHERE active = true AND retired_at IS NULL AND interval = $1 ORDER BY sort ASC, price_pence ASC LIMIT 1`,
                [interval]
            );
            if (p.rows.length) {
                await pool.query(
                    `UPDATE "user" SET plan_id = COALESCE(plan_id, $1), updated_at = $2 WHERE id = $3`,
                    [p.rows[0].id, Date.now(), userId]
                );
            }
        }

        // Check if GoCardless is properly configured
        const gocardlessToken = process.env.GC_ACCESS_TOKEN || process.env.GOCARDLESS_ACCESS_TOKEN;
        const appUrl = process.env.APP_URL || process.env.APP_BASE_URL;

        if (!gocardlessToken || !appUrl) {
            // GoCardless not configured - skip payment setup for now
            console.log(`[Payment] GoCardless not configured, skipping payment setup for user ${userId}`);

            // Mark user as having payment setup pending
            await pool.query(`
                UPDATE "user"
                SET plan_status = 'pending_payment', updated_at = $1
                WHERE id = $2
            `, [Date.now(), userId]);

            return res.json({
                ok: true,
                data: {
                    skip_payment: true,
                    message: "Payment setup will be completed later"
                },
                redirect_url: null
            });
        }

        // Create Billing Request Flow and redirect user to GoCardless (Sandbox/Live based on GC_ENVIRONMENT)
        // GoCardless will redirect back to `${APP_URL}/billing?billing_request_flow_id=BRFxxx`
        // Trim trailing slashes from APP_URL/APP_BASE_URL
        const redirectUri = `${String(appUrl).replace(/\/+$/, '')}/billing`;
        const link = await gcCreateBrfUrl(Number(userId), redirectUri, {
            plan_id: String(chosenPlanId ?? ""),
            billing_period: cadence
        });

        return res.json({
            ok: true,
            data: {
                redirect_url: link.redirect_url,
                email: user.email
            },
            redirect_url: link.redirect_url
        });
    } catch (error: any) {
        console.error('[POST /api/payments/redirect-flows] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/payments/redirect-flows/:flowId/complete
 * Complete GoCardless Billing Request Flow after user returns (billing_request_flow_id)
 */
router.post('/redirect-flows/:flowId/complete', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const flowId = req.params.flowId;
    const pool = getPool();

    try {
        // Complete Billing Request Flow with GoCardless API and retrieve mandate/customer ids
        const completed = await gcCompleteFlow(flowId);
        const mandateId = completed.mandate_id;
        const customerId = completed.customer_id || null;

        // Persist plan_id linkage (fixes "Active" + "No plan")
        // In live, this will fail if no explicit plan was selected earlier.
        await ensureUserPlanLinked({ pool, userId: Number(userId), cadence: "monthly" });

        // Update user + subscription with GoCardless mandate
        await pool.query(`
            UPDATE "user"
            SET
                gocardless_mandate_id = $1,
                gocardless_customer_id = COALESCE(gocardless_customer_id, $4),
                plan_status = 'active',
                plan_start_date = COALESCE(plan_start_date, $2),
                updated_at = $2
            WHERE id = $3
        `, [mandateId, Date.now(), userId, customerId]);

        // Ensure subscription row exists and matches the chosen plan
        await upsertSubscriptionForUser({
            pool,
            userId: Number(userId),
            status: 'active',
            mandateId,
            customerId,
        });

        return res.json({
            ok: true,
            mandate_id: mandateId,
            status: 'active'
        });
    } catch (error: any) {
        console.error('[POST /api/payments/redirect-flows/:flowId/complete] error:', error);
        return res.status(500).json({ ok: false, error: 'completion_error', message: error.message });
    }
});

export default router;
