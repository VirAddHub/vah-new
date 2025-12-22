import { Router, Request, Response } from 'express';
import { getPool } from '../../lib/db';
import { gcVerifyWebhookSignature, gcCompleteFlow, gcGetPayment, gcGetMandate } from '../../lib/gocardless';
import {
    createInvoiceForPayment,
    getBillingPeriodForUser,
    findUserIdForPayment
} from '../../services/invoices';
import { generateInvoiceForPeriod } from '../../services/billing/invoiceService';
import { sendInvoiceSent, sendPaymentFailed } from '../../lib/mailer';
import { ensureUserPlanLinked } from '../services/plan-linking';
import { upsertSubscriptionForUser } from '../services/subscription-linking';
import { isStaleWebhookEvent, updateSubscriptionEventInfo, insertPlanStatusEvent } from '../services/planStatusAudit';

const router = Router();

/**
 * POST /api/webhooks/gocardless
 * Handle GoCardless webhooks with raw body for signature verification
 */
router.get('/gocardless', (_req: Request, res: Response) => {
    // Path sanity-check only (no secrets, no signature bypass).
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
});

router.post('/gocardless', async (req: Request, res: Response) => {
    try {
        const now = Date.now();

        // Get raw body for signature verification
        const rawBody = (req as any).rawBody || req.body?.toString?.() || JSON.stringify(req.body);
        const signature = req.headers['webhook-signature'] as string;

        console.log('[gocardless] webhook hit', {
            method: req.method,
            path: req.path,
            hasSignature: Boolean(signature),
            bodyLen: typeof rawBody === 'string' ? rawBody.length : undefined,
        });

        // Parse body (best-effort). We still store rawBody for debugging.
        let webhook: any = null;
        try {
            webhook = JSON.parse(rawBody);
        } catch (e) {
            console.error('[gocardless] webhook JSON parse failed');
        }

        // Persist webhook receipt immediately (so we can confirm delivery even if signature fails)
        try {
            const pool = getPool();
            const firstEvent = Array.isArray(webhook?.events) ? webhook.events[0] : null;
            const eventType =
                firstEvent?.resource_type && firstEvent?.action
                    ? `${firstEvent.resource_type}.${firstEvent.action}`
                    : 'unknown';

            await pool.query(
                `
                INSERT INTO webhook_log (
                    source,
                    event_type,
                    payload_json,
                    created_at,
                    provider,
                    status,
                    payload,
                    received_at_ms
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
                `,
                [
                    'gocardless',
                    eventType,
                    rawBody,
                    now,
                    'gocardless',
                    'received',
                    webhook ? JSON.stringify(webhook) : null,
                    now,
                ]
            );
        } catch (e) {
            console.error('[gocardless] failed to insert webhook_log', e);
        }

        // Verify webhook signature (always required in production)
        const isProd = process.env.NODE_ENV === 'production';
        const secret = process.env.GC_WEBHOOK_SECRET || '';

        if (isProd && !secret) {
            console.error('[GoCardless webhook] Missing webhook secret (set GC_WEBHOOK_SECRET)');
            return res.status(500).json({ ok: false, error: 'missing_gc_webhook_secret' });
        }

        if (!gcVerifyWebhookSignature(rawBody, signature)) {
            if (isProd) {
                console.error('[GoCardless webhook] Invalid signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.warn('[GoCardless webhook] Signature verification skipped (non-production or secret not set)');
        }

        if (!webhook) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }

        const { events } = webhook;

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'Invalid webhook format' });
        }

        const pool = getPool();

        for (const event of events) {
            const { resource_type, action, links, id: eventId, created_at: eventCreatedAt } = event;
            // GoCardless events may include a full resource object (check common patterns)
            const resource = (event as any).billing_requests || (event as any).mandates || (event as any).resource || null;

            console.log(`[GoCardless webhook] Processing ${resource_type}.${action}`, {
                eventId,
                eventCreatedAt,
            });

            // Event context for handlers
            const eventContext = {
                eventId: eventId as string | undefined,
                eventCreatedAt: eventCreatedAt as string | undefined,
                eventType: `${resource_type}.${action}`,
            };

            switch (`${resource_type}.${action}`) {
                case 'billing_requests.payer_details_confirmed':
                    await handleBillingRequestPayerConfirmed(pool, links, eventContext);
                    break;

                case 'billing_requests.fulfilled':
                    await handleBillingRequestFulfilled(pool, links, resource, eventContext);
                    break;

                case 'mandates.created':
                    await handleMandateCreated(pool, links, resource, eventContext);
                    break;

                case 'mandates.submitted':
                    await handleMandateSubmitted(pool, links, eventContext);
                    break;

                case 'mandates.active':
                    await handleMandateActive(pool, links, eventContext);
                    break;

                case 'payments.confirmed':
                    await handlePaymentConfirmed(pool, links, eventContext);
                    break;

                case 'payments.failed':
                    await handlePaymentFailed(pool, links, eventContext);
                    break;

                case 'subscriptions.updated':
                    await handleSubscriptionUpdated(pool, links, eventContext);
                    break;

                default:
                    console.log(`[GoCardless webhook] Unhandled event: ${resource_type}.${action}`);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[GoCardless webhook] error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

async function handleMandateActive(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const mandateId = links?.mandate;
        if (!mandateId) {
            console.warn('[GoCardless] mandates.active: no mandate_id in links');
            return;
        }

        // 1) Look up mandate -> customer via GoCardless API
        let customerId: string | null = null;
        try {
            const mandateRes = await gcGetMandate(String(mandateId));
            customerId = mandateRes?.customer_id ?? null;
        } catch (e) {
            console.warn('[GoCardless] mandates.active: failed to fetch mandate from API:', (e as any)?.message ?? e);
            // Fallback: try webhook links (though they're usually empty for mandates.active)
            customerId = links?.customer ?? null;
        }

        if (!customerId) {
            console.warn('[GoCardless] mandates.active: no customer_id found for mandate', { mandateId });
            return;
        }

        // 2) Resolve user_id from customer_id, then UPSERT subscription
        const userLookup = await pool.query(
            `SELECT id FROM "user" WHERE gocardless_customer_id = $1 LIMIT 1`,
            [customerId]
        );

        const userId = userLookup.rows?.[0]?.id ?? null;

        if (!userId) {
            console.warn('[GoCardless] mandates.active: unknown_customer_id', { customerId, mandateId });
            return; // Don't fail webhook, just log and return
        }

        // 3) Check for stale event (out-of-order protection)
        if (eventContext.eventCreatedAt) {
            const staleCheck = await isStaleWebhookEvent(userId, eventContext.eventCreatedAt, eventContext.eventId);
            if (staleCheck.isStale) {
                console.warn('[GoCardless] mandates.active: stale event ignored', {
                    userId,
                    eventId: eventContext.eventId,
                    eventCreatedAt: eventContext.eventCreatedAt,
                    lastEventCreatedAt: staleCheck.lastEventCreatedAt,
                    lastEventId: staleCheck.lastEventId,
                });
                return; // Ignore stale event
            }
        }

        // 4) Get current subscription status before update (for audit)
        const currentSub = await pool.query(
            `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
            [userId]
        );
        const oldStatus = currentSub.rows[0]?.status ?? null;
        const subscriptionId = currentSub.rows[0]?.id ?? null;

        // 5) UPSERT subscription using user_id (ensures exactly one subscription per user)
        await pool.query(
            `
            INSERT INTO subscription (user_id, mandate_id, status, updated_at)
            VALUES ($1, $2, 'active', NOW())
            ON CONFLICT (user_id) DO UPDATE SET
              mandate_id = COALESCE(EXCLUDED.mandate_id, subscription.mandate_id),
              status = CASE WHEN subscription.status = 'active' THEN subscription.status ELSE 'active' END,
              updated_at = NOW()
            RETURNING id, status
            `,
            [userId, mandateId]
        );

        // 6) Get new status after update
        const updatedSub = await pool.query(
            `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
            [userId]
        );
        const newStatus = updatedSub.rows[0]?.status ?? 'active';
        const finalSubscriptionId = updatedSub.rows[0]?.id ?? subscriptionId;

        // 7) Update plan_status on user (cache for UI)
        if (oldStatus !== 'active' && newStatus === 'active') {
            await pool.query(
                `
                UPDATE "user"
                SET gocardless_customer_id = COALESCE(gocardless_customer_id, $1),
                    gocardless_mandate_id = COALESCE(gocardless_mandate_id, $2),
                    plan_status = 'active',
                    subscription_status = 'active',
                    plan_start_date = COALESCE(plan_start_date, $3),
                    updated_at = $3
                WHERE id = $4
                `,
                [customerId, mandateId, Date.now(), userId]
            );

            // 8) Insert audit event
            await insertPlanStatusEvent({
                userId,
                subscriptionId: finalSubscriptionId,
                oldStatus,
                newStatus,
                reason: 'webhook_mandate_active',
                gocardlessEventId: eventContext.eventId,
                gocardlessEventType: eventContext.eventType,
                gocardlessEventCreatedAt: eventContext.eventCreatedAt,
                metadata: { customerId, mandateId },
            });
        }

        // 9) Update subscription event info (after successful processing)
        if (eventContext.eventCreatedAt) {
            await updateSubscriptionEventInfo(userId, eventContext.eventCreatedAt, eventContext.eventId);
        }

        // 10) Persist plan_id linkage (fixes "Active" + "No plan")
        try {
            await ensureUserPlanLinked({ pool, userId, cadence: "monthly" });
        } catch (e) {
            console.error('[GoCardless] mandates.active: plan linkage failed for user', userId, e);
        }

        console.log(`[GoCardless] mandates.active: attached mandate ${mandateId} to subscription for user ${userId} (customer ${customerId})`);
    } catch (error) {
        console.error('[GoCardless] Error handling mandates.active:', error);
    }
}

async function handlePaymentConfirmed(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const paymentId = links.payment;
        if (!paymentId) {
            console.error('[Webhook] ❌ No payment ID in links');
            return;
        }

        console.log(`[Webhook] 💳 Processing payment confirmed: ${paymentId}`);

        // Fetch payment details from GoCardless API
        let paymentDetails;
        try {
            paymentDetails = await gcGetPayment(paymentId);
            console.log(`[Webhook] ✅ Fetched payment details: ${paymentDetails.amount}p ${paymentDetails.currency}`);
        } catch (apiError) {
            console.error(`[Webhook] ⚠️  Failed to fetch payment ${paymentId} from API:`, apiError);
            // Continue with webhook data if API call fails
            paymentDetails = null;
        }

        // Find user ID from payment
        const userId = await findUserIdForPayment(pool, paymentId, links);

        if (!userId) {
            console.error(`[Webhook] ❌ Could not find user for payment ${paymentId}`);
            return;
        }

        console.log(`[Webhook] 👤 Found user ${userId} for payment ${paymentId}`);

        // Update subscription status
        await upsertSubscriptionForUser({
            pool,
            userId,
            status: 'active',
            mandateId: links?.mandate ?? null,
        });

        // Persist plan_id linkage (fixes "Active" + "No plan")
        try {
            await ensureUserPlanLinked({ pool, userId, cadence: "monthly" });
        } catch (e) {
            console.error('[GoCardless] Plan linkage missing in live environment for user', userId, e);
        }

        // Store GoCardless identifiers on user for future lookups (best-effort)
        // Set subscription_status when mandate is stored
        if (links?.customer || links?.mandate) {
            await pool.query(
                `
                UPDATE "user"
                SET
                    gocardless_customer_id = COALESCE(gocardless_customer_id, $1),
                    gocardless_mandate_id = COALESCE(gocardless_mandate_id, $2),
                    subscription_status = CASE WHEN $2 IS NOT NULL AND gocardless_mandate_id IS NULL THEN 'active' ELSE subscription_status END,
                    updated_at = $3
                WHERE id = $4
                `,
                [links.customer ?? null, links.mandate ?? null, Date.now(), userId]
            );
        }

        // Get billing period
        const { periodStart, periodEnd } = await getBillingPeriodForUser(userId);
        console.log(`[Webhook] 📅 Billing period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

        // Get payment amount (from API or webhook)
        const amountPence = paymentDetails?.amount ?? links.amount ?? 997; // Fallback to £9.97
        const currency = paymentDetails?.currency ?? 'GBP';

        // Generate invoice with automated charge attachment
        // This uses the new invoiceService which automatically:
        // 1. Creates/updates invoice for the period
        // 2. Attaches pending charges in the period
        // 3. Recomputes invoice amount from attached charges
        try {
            // First, generate invoice with charge attachment
            const invoiceResult = await generateInvoiceForPeriod({
                userId,
                periodStart,
                periodEnd,
                billingInterval: 'monthly', // TODO: derive from subscription
                currency,
                gocardlessPaymentId: paymentId,
            });

            console.log(`[Webhook] ✅ Invoice generated: ID ${invoiceResult.invoiceId}, attached ${invoiceResult.attachedCount} charges, total ${invoiceResult.totalChargesPence}p`);

            // Then create PDF and send email using existing service
            // Note: createInvoiceForPayment will find the existing invoice by gocardless_payment_id
            const invoice = await createInvoiceForPayment({
                userId,
                gocardlessPaymentId: paymentId,
                amountPence: invoiceResult.totalChargesPence, // Use computed amount from charges
                currency,
                periodStart,
                periodEnd,
            });

            console.log(`[Webhook] ✅ Invoice created: ${invoice.invoice_number} (ID: ${invoice.id}) for user ${userId}`);
            console.log(`[Webhook] 📄 PDF path: ${invoice.pdf_path || 'pending generation'}`);

            // Send invoice email (best-effort)
            try {
                const u = await pool.query(
                    `SELECT email, first_name, last_name, company_name FROM "user" WHERE id=$1 LIMIT 1`,
                    [userId]
                );
                const user = u.rows[0];
                if (user?.email) {
                    const amount = `£${(Number(amountPence) / 100).toFixed(2)}`;
                    await sendInvoiceSent({
                        email: user.email,
                        firstName: user.first_name,
                        name: user.company_name || [user.first_name, user.last_name].filter(Boolean).join(' '),
                        invoice_number: invoice.invoice_number || undefined,
                        amount,
                        cta_url: undefined,
                    });
                }
            } catch (emailErr) {
                console.error(`[Webhook] ⚠️ Failed to send invoice email for ${paymentId}:`, emailErr);
            }
        } catch (invoiceError) {
            console.error(`[Webhook] ❌ Failed to create invoice for payment ${paymentId}:`, invoiceError);
            // Don't throw - payment is still confirmed
        }

        // Clear payment failure state
        await pool.query(`
            UPDATE "user" 
            SET payment_failed_at = NULL,
                payment_retry_count = 0,
                payment_grace_until = NULL,
                account_suspended_at = NULL,
                updated_at = $1
            WHERE id = $2
        `, [Date.now(), userId]);

        console.log(`[Webhook] ✅ Payment ${paymentId} confirmed and processed for user ${userId}`);
    } catch (error) {
        console.error('[GoCardless] Error handling payment.confirmed:', error);
    }
}

async function handlePaymentFailed(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const paymentId = links.payment;
        const userId = await findUserIdForPayment(pool, paymentId, links);

        if (userId) {
            // Check for stale event (out-of-order protection)
            if (eventContext.eventCreatedAt) {
                const staleCheck = await isStaleWebhookEvent(userId, eventContext.eventCreatedAt, eventContext.eventId);
                if (staleCheck.isStale) {
                    console.warn('[GoCardless] payments.failed: stale event ignored', {
                        userId,
                        paymentId,
                        eventId: eventContext.eventId,
                        eventCreatedAt: eventContext.eventCreatedAt,
                        lastEventCreatedAt: staleCheck.lastEventCreatedAt,
                        lastEventId: staleCheck.lastEventId,
                    });
                    return; // Ignore stale event
                }
            }

            // Get current subscription status before update (for audit)
            const currentSub = await pool.query(
                `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
                [userId]
            );
            const oldStatus = currentSub.rows[0]?.status ?? null;
            const subscriptionId = currentSub.rows[0]?.id ?? null;

            // UPSERT pattern: ensure subscription exists, update status
            await pool.query(`
                INSERT INTO subscription (user_id, status, updated_at)
                VALUES ($1, 'past_due', NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                  status = 'past_due',
                  updated_at = NOW()
                RETURNING id, status
            `, [userId]);

            // Get new status after update
            const updatedSub = await pool.query(
                `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
                [userId]
            );
            const newStatus = updatedSub.rows[0]?.status ?? 'past_due';
            const finalSubscriptionId = updatedSub.rows[0]?.id ?? subscriptionId;

            // Update plan_status on user (cache for UI) - only if status changed
            if (oldStatus !== 'past_due' && newStatus === 'past_due') {
                await pool.query(
                    `UPDATE "user" SET plan_status = 'past_due', updated_at = $1 WHERE id = $2`,
                    [Date.now(), userId]
                );

                // Insert audit event
                await insertPlanStatusEvent({
                    userId,
                    subscriptionId: finalSubscriptionId,
                    oldStatus,
                    newStatus,
                    reason: 'webhook_payment_failed',
                    gocardlessEventId: eventContext.eventId,
                    gocardlessEventType: eventContext.eventType,
                    gocardlessEventCreatedAt: eventContext.eventCreatedAt,
                    metadata: { paymentId },
                });
            }

            // Update subscription event info (after successful processing)
            if (eventContext.eventCreatedAt) {
                await updateSubscriptionEventInfo(userId, eventContext.eventCreatedAt, eventContext.eventId);
            }

            console.log(`[GoCardless] Payment ${paymentId} failed for user ${userId}`);

            // Best-effort email
            try {
                const u = await pool.query(
                    `SELECT email, first_name, last_name, company_name FROM "user" WHERE id=$1 LIMIT 1`,
                    [userId]
                );
                const user = u.rows[0];
                if (user?.email) {
                    const appUrl = (process.env.APP_URL ?? process.env.APP_BASE_URL ?? 'https://virtualaddresshub.co.uk').replace(/\/+$/, '');
                    await sendPaymentFailed({
                        email: user.email,
                        firstName: user.first_name,
                        name: user.company_name || [user.first_name, user.last_name].filter(Boolean).join(' '),
                        cta_url: `${appUrl}/billing`,
                    });
                }
            } catch (emailErr) {
                console.error(`[Webhook] ⚠️ Failed to send payment failed email for ${paymentId}:`, emailErr);
            }
        }
    } catch (error) {
        console.error('[GoCardless] Error handling payment.failed:', error);
    }
}

async function handleSubscriptionUpdated(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const subscriptionId = links.subscription;
        // Update subscription details from GoCardless
        console.log(`[GoCardless] Subscription ${subscriptionId} updated`);
    } catch (error) {
        console.error('[GoCardless] Error handling subscription.updated:', error);
    }
}

async function handleBillingRequestPayerConfirmed(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        // Extract all possible identifiers from webhook payload
        const flowId = links?.billing_request_flow ?? links?.billing_request_flow_id ?? null;
        const billingRequestId = links?.billing_request ?? links?.billing_request_id ?? null;
        const customerId = links?.customer ?? null;

        if (!customerId) {
            console.log('[GoCardless] payer_details_confirmed: missing customer_id', { flowId, billingRequestId });
            return;
        }

        // Resolve user via gc_billing_request_flow: try billing_request_flow_id, then billing_request_id, then customer_id
        let row: any = null;
        try {
            // 1) Try by billing_request_flow_id
            if (flowId) {
                const r1 = await pool.query(
                    `SELECT user_id, plan_id FROM gc_billing_request_flow WHERE billing_request_flow_id = $1 ORDER BY id DESC LIMIT 1`,
                    [String(flowId)]
                );
                if (r1.rows?.length) row = r1.rows[0];
            }

            // 2) Try by billing_request_id
            if (!row?.user_id && billingRequestId) {
                const r2 = await pool.query(
                    `SELECT user_id, plan_id FROM gc_billing_request_flow WHERE billing_request_id = $1 ORDER BY id DESC LIMIT 1`,
                    [String(billingRequestId)]
                );
                if (r2.rows?.length) row = r2.rows[0];
            }

            // 3) Try by customer_id (if already stored from a previous event)
            if (!row?.user_id && customerId) {
                const r3 = await pool.query(
                    `SELECT user_id, plan_id FROM gc_billing_request_flow WHERE customer_id = $1 ORDER BY id DESC LIMIT 1`,
                    [String(customerId)]
                );
                if (r3.rows?.length) row = r3.rows[0];
            }
        } catch (e) {
            console.warn('[GoCardless] payer_details_confirmed: gc_billing_request_flow lookup failed', (e as any)?.message ?? e);
        }

        // Fallback: try gc_redirect_flow if we have flowId
        if (!row?.user_id && flowId) {
            try {
                const r = await pool.query(
                    `SELECT user_id, plan_id FROM gc_redirect_flow WHERE flow_id = $1 ORDER BY id DESC LIMIT 1`,
                    [String(flowId)]
                );
                if (r.rows?.length) row = r.rows[0];
            } catch {
                // ignore
            }
        }

        // Final fallback: resolve user directly by customer_id (if already stored)
        if (!row?.user_id && customerId) {
            try {
                const u = await pool.query(
                    `SELECT id, plan_id FROM "user" WHERE gocardless_customer_id = $1 LIMIT 1`,
                    [String(customerId)]
                );
                if (u.rows?.length) {
                    row = { user_id: u.rows[0].id, plan_id: u.rows[0].plan_id };
                }
            } catch {
                // ignore
            }
        }

        if (!row?.user_id) {
            console.log('[GoCardless] payer_details_confirmed: could not resolve user', {
                flowId,
                billingRequestId,
                customerId,
                tried: ['gc_billing_request_flow (flow_id)', 'gc_billing_request_flow (request_id)', 'gc_billing_request_flow (customer_id)', 'gc_redirect_flow', 'user.gocardless_customer_id'],
            });
            return;
        }

        const userId = Number(row.user_id);
        const planId = row.plan_id ? Number(row.plan_id) : null;

        // Webhook rule: when resolving by billing_request_id and event includes links.customer,
        // use customer_id as source-of-truth (overwrite if different)
        // If billingRequestId exists in event, we may have resolved via billing_request_id, so overwrite customer_id
        const shouldOverwriteCustomerId = !!billingRequestId && !!customerId;

        // Get current customer_id to check if we need to overwrite
        const userCheck = await pool.query(
            `SELECT gocardless_customer_id FROM "user" WHERE id = $1`,
            [userId]
        );
        const currentUserCustomerId = userCheck.rows?.[0]?.gocardless_customer_id ?? null;

        const subCheck = await pool.query(
            `SELECT customer_id FROM subscription WHERE user_id = $1`,
            [userId]
        );
        const currentSubCustomerId = subCheck.rows?.[0]?.customer_id ?? null;

        // If overwriting customer_id and it differs, log warning
        if (shouldOverwriteCustomerId) {
            if (currentUserCustomerId && currentUserCustomerId !== customerId) {
                console.warn('[GoCardless] payer_details_confirmed: overwriting user.gocardless_customer_id', {
                    userId,
                    old: currentUserCustomerId,
                    new: customerId,
                    source: 'billing_request_id resolution'
                });
            }
            if (currentSubCustomerId && currentSubCustomerId !== customerId) {
                console.warn('[GoCardless] payer_details_confirmed: overwriting subscription.customer_id', {
                    userId,
                    old: currentSubCustomerId,
                    new: customerId,
                    source: 'billing_request_id resolution'
                });
            }
        }

        // Store customer_id on user (overwrite if billingRequestId exists, otherwise use COALESCE)
        await pool.query(
            `
            UPDATE "user"
            SET
              gocardless_customer_id = CASE WHEN $5 IS TRUE AND $1 IS NOT NULL THEN $1 ELSE COALESCE(gocardless_customer_id, $1) END,
              plan_id = COALESCE(plan_id, $2),
              plan_status = CASE WHEN plan_status = 'active' THEN plan_status ELSE 'pending_payment' END,
              updated_at = $3
            WHERE id = $4
            `,
            [String(customerId), planId, Date.now(), userId, shouldOverwriteCustomerId]
        );

        // Ensure subscription row exists and attach customer_id
        await upsertSubscriptionForUser({
            pool,
            userId,
            status: 'pending',
            customerId: String(customerId),
        });

        // If overwriting, explicitly update subscription customer_id
        if (shouldOverwriteCustomerId) {
            await pool.query(
                `
                UPDATE subscription
                SET customer_id = $1, updated_at = $2
                WHERE user_id = $3
                `,
                [String(customerId), Date.now(), userId]
            );
        }

        // Mark BRQ/BRF record as confirmed (best-effort)
        try {
            await pool.query(
                `
                UPDATE gc_billing_request_flow
                SET customer_id = $2, status = 'confirmed'
                WHERE billing_request_flow_id = $1
                   OR billing_request_id = $3
                `,
                [String(flowId ?? ''), String(customerId), String(billingRequestId ?? '')]
            );
        } catch {
            // ignore (table may not exist yet)
        }

        console.log(`[GoCardless] payer_details_confirmed: linked customer ${customerId} to user ${userId}, subscription updated`);
    } catch (e) {
        console.error('[GoCardless] Error handling billing_requests.payer_details_confirmed:', e);
    }
}

async function handleMandateSubmitted(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const mandateId = links?.mandate ?? null;
        let customerId = links?.customer ?? null;

        if (!mandateId) return;

        // Hydrate missing customer via API (best-effort)
        if (!customerId) {
            try {
                const m = await gcGetMandate(String(mandateId));
                customerId = m.customer_id ?? null;
            } catch (e) {
                console.warn('[GoCardless] mandate.submitted hydrate customer failed:', (e as any)?.message ?? e);
            }
        }

        const userId = await findUserIdForGcIdentifiers(pool, {
            customerId,
            mandateId,
        });
        if (!userId) return;

        // Store ids (do NOT force active here; that happens on mandates.active / flow completion)
        // But set subscription_status when mandate is stored
        await pool.query(
            `
            UPDATE "user"
            SET
              gocardless_mandate_id = COALESCE(gocardless_mandate_id, $1),
              gocardless_customer_id = COALESCE(gocardless_customer_id, $2),
              plan_status = CASE WHEN plan_status = 'active' THEN plan_status ELSE 'pending_payment' END,
              subscription_status = 'active',
              updated_at = $3
            WHERE id = $4
            `,
            [String(mandateId), customerId ?? null, Date.now(), userId]
        );

        await upsertSubscriptionForUser({
            pool,
            userId,
            status: 'pending',
            mandateId: String(mandateId),
            customerId: customerId ?? null,
        });
    } catch (e) {
        console.error('[GoCardless] Error handling mandates.submitted:', e);
    }
}

async function handleBillingRequestFulfilled(pool: any, links: any, resource: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        // Billing flow completed. Treat as "subscription can be active".
        const billingRequestId = resource?.id ?? links?.billing_request ?? null;
        const customerId =
            resource?.links?.customer ??
            resource?.links?.payer ??
            links?.customer ??
            links?.payer ??
            null;

        if (!customerId && !billingRequestId) {
            console.log('[GoCardless] fulfilled: missing customerId/billingRequestId', {
                billingRequestId,
                customerId,
                links,
            });
            return;
        }

        // Find subscription by customerId (preferred) - resolve user_id first, then UPSERT
        if (customerId) {
            const userLookup = await pool.query(
                `SELECT id FROM "user" WHERE gocardless_customer_id = $1 LIMIT 1`,
                [customerId]
            );

            const userId = userLookup.rows?.[0]?.id ?? null;

            if (userId) {
                // UPSERT subscription using user_id (ensures exactly one subscription per user)
                await pool.query(
                    `
                    INSERT INTO subscription (user_id, status, updated_at)
                    VALUES ($1, 'active', NOW())
                    ON CONFLICT (user_id) DO UPDATE SET
                      status = CASE WHEN subscription.status = 'active' THEN subscription.status ELSE 'active' END,
                      updated_at = NOW()
                    `,
                    [userId]
                );

                console.log('[GoCardless] fulfilled: subscription marked active', {
                    customerId,
                    billingRequestId,
                    userId,
                });
                return;
            } else {
                console.warn('[GoCardless] fulfilled: unknown_customer_id', { customerId, billingRequestId });
                // Continue to fallback logic below
            }
        }

        // Fallback: try by billing_request_id if we have it stored in gc_billing_request_flow
        if (billingRequestId) {
            try {
                const brfRow = await pool.query(
                    `SELECT user_id FROM gc_billing_request_flow WHERE billing_request_id = $1 ORDER BY id DESC LIMIT 1`,
                    [String(billingRequestId)]
                );
                if (brfRow.rows?.length) {
                    const userId = brfRow.rows[0].user_id;

                    // Webhook rule: if event includes links.customer, use it as source-of-truth
                    // Overwrite user.gocardless_customer_id and subscription.customer_id if different
                    const eventCustomerId = customerId; // Already extracted above
                    if (eventCustomerId) {
                        // Get current customer_id from user and subscription
                        const userCheck = await pool.query(
                            `SELECT gocardless_customer_id FROM "user" WHERE id = $1`,
                            [userId]
                        );
                        const currentUserCustomerId = userCheck.rows?.[0]?.gocardless_customer_id ?? null;

                        const subCheck = await pool.query(
                            `SELECT customer_id FROM subscription WHERE user_id = $1`,
                            [userId]
                        );
                        const currentSubCustomerId = subCheck.rows?.[0]?.customer_id ?? null;

                        // Log warning if overwriting different customer_id
                        if (currentUserCustomerId && currentUserCustomerId !== eventCustomerId) {
                            console.warn('[GoCardless] fulfilled: overwriting user.gocardless_customer_id', {
                                userId,
                                old: currentUserCustomerId,
                                new: eventCustomerId,
                                source: 'billing_request_id resolution'
                            });
                        }
                        if (currentSubCustomerId && currentSubCustomerId !== eventCustomerId) {
                            console.warn('[GoCardless] fulfilled: overwriting subscription.customer_id', {
                                userId,
                                old: currentSubCustomerId,
                                new: eventCustomerId,
                                source: 'billing_request_id resolution'
                            });
                        }

                        // Update user and subscription with event customer_id
                        await pool.query(
                            `
                            UPDATE "user"
                            SET gocardless_customer_id = $1, updated_at = $2
                            WHERE id = $3
                            `,
                            [eventCustomerId, Date.now(), userId]
                        );
                    }

                    await pool.query(
                        `
                        UPDATE subscription
                        SET
                            status = CASE WHEN status = 'active' THEN status ELSE 'active' END,
                            customer_id = CASE WHEN $1 IS NOT NULL THEN $1 ELSE customer_id END,
                            updated_at = $2
                        WHERE user_id = $3
                        `,
                        [eventCustomerId, Date.now(), userId]
                    );
                    console.log('[GoCardless] fulfilled: subscription marked active (via billing_request_id)', {
                        billingRequestId,
                        userId,
                        customerId: eventCustomerId,
                    });
                }
            } catch (e) {
                console.warn('[GoCardless] fulfilled: failed to lookup by billing_request_id', (e as any)?.message ?? e);
            }
        }
    } catch (error) {
        console.error('[GoCardless] Error handling billing_requests.fulfilled:', error);
    }
}

async function handleMandateCreated(pool: any, links: any, resource: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        // Mandate is the "hard truth" for Direct Debit.
        const mandateId = resource?.id ?? links?.mandate ?? null;
        // customerId is often NOT present on mandates.created
        const customerId = resource?.links?.customer ?? links?.customer ?? null;
        // We DO have billing_request, use it as the fallback key
        const billingRequestId = resource?.links?.billing_request ?? links?.billing_request ?? null;

        console.log('[GoCardless] mandates.created: processing', {
            mandateId,
            customerId,
            billingRequestId,
            hasResource: !!resource,
            links,
        });

        if (!mandateId) {
            console.log('[GoCardless] mandates.created: missing mandateId', {
                links,
            });
            return;
        }

        // Path A: customerId present - resolve user_id first, then UPSERT
        if (customerId) {
            const userLookup = await pool.query(
                `SELECT id FROM "user" WHERE gocardless_customer_id = $1 LIMIT 1`,
                [customerId]
            );

            const userId = userLookup.rows?.[0]?.id ?? null;

            if (userId) {
                // UPSERT subscription using user_id (ensures exactly one subscription per user)
                await pool.query(
                    `
                    INSERT INTO subscription (user_id, mandate_id, status, updated_at)
                    VALUES ($1, $2, 'active', NOW())
                    ON CONFLICT (user_id) DO UPDATE SET
                      mandate_id = COALESCE(EXCLUDED.mandate_id, subscription.mandate_id),
                      status = CASE WHEN subscription.status = 'active' THEN subscription.status ELSE 'active' END,
                      updated_at = NOW()
                    `,
                    [userId, mandateId]
                );

                // Also update user table (best-effort, never downgrade active status)
                await pool.query(
                    `
                    UPDATE "user"
                    SET
                        gocardless_mandate_id = COALESCE(gocardless_mandate_id, $1),
                        gocardless_customer_id = COALESCE(gocardless_customer_id, $2),
                        plan_status = CASE WHEN plan_status = 'active' THEN plan_status ELSE 'active' END,
                        subscription_status = 'active',
                        updated_at = $3
                    WHERE id = $4
                    `,
                    [mandateId, customerId, Date.now(), userId]
                );

                console.log('[GoCardless] mandates.created: mandate attached + active (by customer)', {
                    customerId,
                    mandateId,
                    userId,
                });
                return;
            } else {
                console.warn('[GoCardless] mandates.created: unknown_customer_id', { customerId, mandateId });
                // Continue to Path B fallback below
            }
        }

        // Path B: customerId missing — resolve via billing_request mapping table
        if (billingRequestId) {
            try {
                // 1) find mapping row in gc_billing_request_flow by billing_request_id
                const mappingResult = await pool.query(
                    `SELECT user_id, plan_id FROM gc_billing_request_flow WHERE billing_request_id = $1 ORDER BY id DESC LIMIT 1`,
                    [String(billingRequestId)]
                );

                if (mappingResult.rows?.length) {
                    const userId = mappingResult.rows[0].user_id;

                    // Webhook rule: if event includes links.customer, use it as source-of-truth
                    // Overwrite user.gocardless_customer_id and subscription.customer_id if different
                    const eventCustomerId = links?.customer ?? null;
                    let finalCustomerId = eventCustomerId;

                    if (eventCustomerId) {
                        // Get current customer_id from user and subscription
                        const userCheck = await pool.query(
                            `SELECT gocardless_customer_id FROM "user" WHERE id = $1`,
                            [userId]
                        );
                        const currentUserCustomerId = userCheck.rows?.[0]?.gocardless_customer_id ?? null;

                        const subCheck = await pool.query(
                            `SELECT customer_id FROM subscription WHERE user_id = $1`,
                            [userId]
                        );
                        const currentSubCustomerId = subCheck.rows?.[0]?.customer_id ?? null;

                        // Log warning if overwriting different customer_id
                        if (currentUserCustomerId && currentUserCustomerId !== eventCustomerId) {
                            console.warn('[GoCardless] mandates.created: overwriting user.gocardless_customer_id', {
                                userId,
                                old: currentUserCustomerId,
                                new: eventCustomerId,
                                source: 'billing_request_id resolution'
                            });
                        }
                        if (currentSubCustomerId && currentSubCustomerId !== eventCustomerId) {
                            console.warn('[GoCardless] mandates.created: overwriting subscription.customer_id', {
                                userId,
                                old: currentSubCustomerId,
                                new: eventCustomerId,
                                source: 'billing_request_id resolution'
                            });
                        }
                    } else {
                        // Fallback to existing subscription customer_id if no event customer_id
                        const subResult = await pool.query(
                            `SELECT customer_id FROM subscription WHERE user_id = $1`,
                            [userId]
                        );
                        finalCustomerId = subResult.rows?.[0]?.customer_id ?? null;
                    }

                    // 2) attach mandate to subscription for that user, update customer_id
                    await pool.query(
                        `
                        UPDATE subscription
                        SET
                            mandate_id = COALESCE(mandate_id, $1),
                            customer_id = CASE WHEN $2 IS NOT NULL THEN $2 ELSE customer_id END,
                            status = CASE WHEN status = 'active' THEN status ELSE 'active' END,
                            updated_at = $3
                        WHERE user_id = $4
                        `,
                        [mandateId, finalCustomerId, Date.now(), userId]
                    );

                    // Also update user table (best-effort, never downgrade active status)
                    await pool.query(
                        `
                        UPDATE "user"
                        SET
                            gocardless_mandate_id = COALESCE(gocardless_mandate_id, $1),
                            gocardless_customer_id = CASE WHEN $2 IS NOT NULL THEN $2 ELSE gocardless_customer_id END,
                            plan_status = CASE WHEN plan_status = 'active' THEN plan_status ELSE 'active' END,
                            subscription_status = 'active',
                            updated_at = $3
                        WHERE id = $4
                        `,
                        [mandateId, finalCustomerId, Date.now(), userId]
                    );

                    console.log('[GoCardless] mandates.created: mandate attached + active (by billing_request)', {
                        billingRequestId,
                        mandateId,
                        userId,
                        customerId: finalCustomerId,
                    });
                    return;
                } else {
                    console.log('[GoCardless] mandates.created: no mapping for billing_request', {
                        billingRequestId,
                        mandateId,
                    });
                }
            } catch (e) {
                console.warn('[GoCardless] mandates.created: failed to lookup by billing_request_id', (e as any)?.message ?? e);
            }
        }

        console.log('[GoCardless] mandates.created: cannot attach (no customerId or billingRequestId)', {
            mandateId,
            customerId,
            billingRequestId,
            links,
        });
    } catch (error) {
        console.error('[GoCardless] Error handling mandates.created:', error);
    }
}

async function findUserIdForGcIdentifiers(
    pool: any,
    ids: { customerId: string | null; mandateId: string | null }
): Promise<number | null> {
    try {
        const { customerId, mandateId } = ids;

        if (customerId) {
            // 1) user by stored customer id
            const u = await pool.query(
                `SELECT id FROM "user" WHERE gocardless_customer_id = $1 LIMIT 1`,
                [customerId]
            );
            const uid = u.rows?.[0]?.id ?? null;
            if (uid) return uid;

            // 2) subscription by stored customer id
            const s = await pool.query(
                `SELECT user_id FROM subscription WHERE customer_id = $1 LIMIT 1`,
                [customerId]
            );
            const sid = s.rows?.[0]?.user_id ?? null;
            if (sid) return sid;

            // 3) billing-request-flow mapping (best-effort)
            try {
                const brf = await pool.query(
                    `SELECT user_id FROM gc_billing_request_flow WHERE customer_id = $1 ORDER BY id DESC LIMIT 1`,
                    [customerId]
                );
                const bid = brf.rows?.[0]?.user_id ?? null;
                if (bid) return bid;
            } catch {
                // table may not exist yet
            }
        }

        if (mandateId) {
            // 3) user by stored mandate id
            const u2 = await pool.query(
                `SELECT id FROM "user" WHERE gocardless_mandate_id = $1 LIMIT 1`,
                [mandateId]
            );
            const uid2 = u2.rows?.[0]?.id ?? null;
            if (uid2) return uid2;

            // 4) subscription by stored mandate id
            const s2 = await pool.query(
                `SELECT user_id FROM subscription WHERE mandate_id = $1 LIMIT 1`,
                [mandateId]
            );
            const sid2 = s2.rows?.[0]?.user_id ?? null;
            if (sid2) return sid2;
        }

        return null;
    } catch (error) {
        console.error('[GoCardless] Error resolving user from GC identifiers:', error);
        return null;
    }
}

// getUserIdFromPayment is now handled by findUserIdForPayment from invoices service

export default router;
