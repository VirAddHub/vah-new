// src/server/routes/payments.ts
// Payment and subscription management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { pricingService } from '../services/pricing';
import { gcCreateBrfUrl, gcCompleteFlow } from '../../lib/gocardless';
import { ensureUserPlanLinked } from '../services/plan-linking';
import { upsertSubscriptionForUser } from '../services/subscription-linking';
import { upsertGcBillingRequestFlow } from '../db/gcBillingRequestFlow';
import { sendPlanCancelled, buildAppUrl } from '../../lib/mailer';

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
        console.log('[GC] redirect-flows input', {
            user_id: userId ?? null,
            plan_id: (req.body as any)?.plan_id ?? (req.body as any)?.planId ?? null,
            billing_period: (req.body as any)?.billing_period ?? (req.body as any)?.billingPeriod ?? null,
        });

        // Get user info including GoCardless fields for guardrails
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name, gocardless_mandate_id, gocardless_redirect_flow_id
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];

        // Guardrail 1: Only block if user has active subscription with mandate
        // Allow restart for cancelled/past_due users even if mandate_id exists
        const sub = await pool.query(
            `SELECT status, mandate_id
             FROM subscription
             WHERE user_id = $1`,
            [userId]
        );

        const subStatus = sub.rows[0]?.status ?? null;
        const mandateId = (user.gocardless_mandate_id || sub.rows[0]?.mandate_id || '').trim();

        // ✅ If user is actually active, block creating extra flows
        if (mandateId && subStatus === 'active') {
            console.log('[GC] redirect-flows: active user already linked, returning alreadyLinked', {
                user_id: userId,
                mandate_id: mandateId,
                subStatus
            });
            return res.json({
                ok: true,
                data: { alreadyLinked: true }
            });
        }

        // ✅ Otherwise allow user to restart payment setup (even if mandate_id exists)
        // because mandate might be revoked/expired OR subscription not active

        // Guardrail 2: If user has a redirect flow but no mandate, allow resume (ONLY if flow is still valid)
        if (user.gocardless_redirect_flow_id?.trim() && !user.gocardless_mandate_id?.trim()) {
            const flowId = user.gocardless_redirect_flow_id.trim();

            // ✅ Only resume if we have a durable record still in 'created'
            const flow = await pool.query(
                `SELECT status FROM gc_redirect_flow WHERE flow_id = $1 LIMIT 1`,
                [flowId]
            );

            if (flow.rows[0]?.status === 'created') {
                console.log('[GC] redirect-flows: resuming existing flow', {
                    user_id: userId,
                    flow_id: flowId,
                    subStatus
                });
                return res.json({
                    ok: true,
                    data: {
                        resume: true,
                        redirectFlowId: flowId
                    }
                });
            }

            // ❌ Otherwise: stale flow id — clear it and continue to create a new one
            console.log('[GC] redirect-flows: clearing stale redirect_flow_id', {
                user_id: userId,
                old_redirect_flow_id: flowId,
                flow_status: flow.rows[0]?.status ?? 'not_found',
                subStatus
            });
            await pool.query(
                `UPDATE "user" SET gocardless_redirect_flow_id = NULL, updated_at = $1 WHERE id = $2`,
                [Date.now(), userId]
            );
        }

        // Persist the selected plan before redirecting to GoCardless.
        // This prevents "active + no plan" later and avoids UI inference.
        // In LIVE, we must not silently default.
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

        // Bulletproof rule: never create a GoCardless flow without an explicit plan_id.
        if (!chosenPlanId) {
            return res.status(400).json({
                ok: false,
                error: "plan_required",
                message: "Please select a plan before starting payment setup.",
            });
        }

        // Verify and set user.plan_id immediately
        const p = await pool.query(
            `SELECT id FROM plans WHERE id = $1 AND active = true AND retired_at IS NULL LIMIT 1`,
            [chosenPlanId]
        );
        if (p.rows.length === 0) {
            return res.status(400).json({ ok: false, error: "invalid_plan", message: "Selected plan is not available." });
        }
        await pool.query(
            `UPDATE "user" SET plan_id = $1, updated_at = $2 WHERE id = $3`,
            [chosenPlanId, Date.now(), userId]
        );

        // Ensure a subscription row exists BEFORE starting GoCardless.
        // UPSERT pattern: exactly one subscription per user
        // Never downgrade existing status (especially active)
        const planRow = await pool.query(
            `SELECT name, interval FROM plans WHERE id = $1 LIMIT 1`,
            [chosenPlanId]
        );
        const planName = planRow.rows?.[0]?.name;
        const interval = String(planRow.rows?.[0]?.interval ?? '');
        const cadenceForSub = interval === 'year' ? 'annual' : 'monthly';
        if (planName) {
            await pool.query(
                `
                INSERT INTO subscription (user_id, plan_name, cadence, status, updated_at)
                VALUES ($1, $2, $3, 'pending', NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                  plan_name = EXCLUDED.plan_name,
                  cadence = EXCLUDED.cadence,
                  updated_at = NOW(),
                  status = CASE
                    WHEN subscription.status = 'active' THEN subscription.status
                    WHEN subscription.status = 'cancelled' THEN 'pending'
                    ELSE subscription.status
                  END
                `,
                [userId, planName, cadenceForSub]
            );
        }

        // Check if GoCardless is properly configured
        const gocardlessToken = process.env.GC_ACCESS_TOKEN || process.env.GOCARDLESS_ACCESS_TOKEN;
        const appUrl = process.env.APP_URL || process.env.APP_BASE_URL;

        if (!gocardlessToken || !appUrl) {
            // GoCardless not configured - skip payment setup for now
            // In dev/staging, activate account even without payment
            console.log(`[Payment] GoCardless not configured, skipping payment setup for user ${userId}`);

            // NOTE: plan_status is only updated via GoCardless webhooks
            // Do not set plan_status here
            // Activate account since payment is skipped (dev/staging only)
            await pool.query(`
                UPDATE "user"
                SET status = 'active', updated_at = $1
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

        // If user had an old flow id, mark it stale so we don't "resume" it again
        if (user.gocardless_redirect_flow_id?.trim()) {
            await pool.query(
                `UPDATE gc_redirect_flow
                 SET status = 'stale'
                 WHERE flow_id = $1 AND status = 'created'`,
                [user.gocardless_redirect_flow_id.trim()]
            );
            console.log('[GC] redirect-flows: marked old flow as stale', {
                user_id: userId,
                old_flow_id: user.gocardless_redirect_flow_id.trim()
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

        // Insert/Upsert BRQ/BRF mapping (used to link webhooks to the correct user)
        // This is critical: webhooks need this mapping to resolve customer_id → user_id.
        try {
            await upsertGcBillingRequestFlow({
                userId: Number(userId),
                planId: chosenPlanId,
                billingRequestId: link.billing_request_id,
                billingRequestFlowId: link.flow_id,
                customerId: null, // Will be filled by payer_details_confirmed webhook
            });
            console.log(`[GC] redirect-flows: saved gc_billing_request_flow mapping`, {
                user_id: userId,
                plan_id: chosenPlanId,
                billing_request_id: link.billing_request_id,
                billing_request_flow_id: link.flow_id,
            });
        } catch (e: any) {
            // Don't break checkout if table doesn't exist yet (migration not run).
            // But log it so we know to run migration 120.
            console.warn('[POST /api/payments/redirect-flows] gc_billing_request_flow insert failed (non-fatal):', (e as any)?.message ?? e);
        }

        // Persist durable mapping: flow_id -> user_id/plan_id
        const planIdRes = await pool.query(`SELECT plan_id FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
        const planId = planIdRes.rows?.[0]?.plan_id ?? null;
        if (!planId) {
            return res.status(400).json({ ok: false, error: "plan_required", message: "A plan must be selected before starting payment setup." });
        }

        try {
            await pool.query(
                `
                INSERT INTO gc_redirect_flow (created_at_ms, user_id, plan_id, flow_id, status)
                VALUES ($1, $2, $3, $4, 'created')
                ON CONFLICT (flow_id) DO NOTHING
                `,
                [Date.now(), userId, planId, link.flow_id]
            );
        } catch (e) {
            // Don't break checkout if table doesn't exist yet (migration not run).
            console.warn('[POST /api/payments/redirect-flows] gc_redirect_flow insert failed:', (e as any)?.message ?? e);
        }

        // Ensure a subscription row exists immediately (prevents manual SQL later).
        // Status is pending until mandate is confirmed.
        await upsertSubscriptionForUser({
            pool,
            userId: Number(userId),
            status: 'pending',
        });

        // NOTE: plan_status is only updated via GoCardless webhooks
        // Do not set plan_status here
        await pool.query(
            `
            UPDATE "user"
            SET updated_at = $1
            WHERE id = $2
            `,
            [Date.now(), userId]
        );

        // Store last flow id on the user for debugging/traceability
        await pool.query(
            `UPDATE "user" SET gocardless_redirect_flow_id = $1, updated_at = $2 WHERE id = $3`,
            [link.flow_id, Date.now(), userId]
        );

        return res.json({
            ok: true,
            data: {
                redirect_url: link.redirect_url,
                email: user.email
            },
            redirect_url: link.redirect_url
        });
    } catch (err: any) {
        console.error('[GC] redirect-flows failed', {
            message: err?.message,
            name: err?.name,
        });

        // Fail cleanly so the frontend can show a friendly retry message.
        // Use 400 (not 500) unless it's clearly a server/database error.
        const msg = String(err?.message || '');
        const isDb = msg.toLowerCase().includes('database') || msg.toLowerCase().includes('postgres');
        return res.status(isDb ? 500 : 400).json({
            ok: false,
            error: isDb ? 'database_error' : 'gocardless_redirect_flow_failed',
            message: isDb ? 'Database error' : 'Payment setup could not be started. Please try again.',
        });
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

        // Update user with GoCardless mandate and activate account
        // NOTE: plan_status is only updated via GoCardless webhooks when subscription.status transitions to 'active'
        await pool.query(`
            UPDATE "user"
            SET
                gocardless_mandate_id = $1,
                gocardless_customer_id = COALESCE(gocardless_customer_id, $4),
                subscription_status = 'active',
                plan_start_date = COALESCE(plan_start_date, $2),
                status = 'active', -- Activate account after payment succeeds
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

        // Mark redirect flow record as completed (best-effort)
        try {
            await pool.query(
                `
                UPDATE gc_redirect_flow
                SET status = 'completed', completed_at_ms = $1
                WHERE flow_id = $2 AND user_id = $3
                `,
                [Date.now(), flowId, userId]
            );
        } catch (e) {
            console.warn('[POST /api/payments/redirect-flows/:flowId/complete] gc_redirect_flow update failed:', (e as any)?.message ?? e);
        }

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
