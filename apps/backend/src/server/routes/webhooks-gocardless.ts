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
import { logger } from '../../lib/logger';

const router = Router();

function redactId(id: unknown): string {
    const s = String(id || '');
    if (!s) return 'n/a';
    if (s.length <= 8) return `${s.slice(0, 2)}…`;
    return `${s.slice(0, 2)}…${s.slice(-4)}`;
}

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

        logger.debug('[gocardless] webhook hit', {
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
            logger.warn('[gocardless] webhook JSON parse failed');
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
            logger.error('[gocardless] failed to insert webhook_log', { message: (e as any)?.message ?? String(e) });
        }

        // Verify webhook signature (always required in production)
        const isProd = process.env.NODE_ENV === 'production';
        const secret = process.env.GC_WEBHOOK_SECRET || '';

        if (isProd && !secret) {
            logger.error('[gocardless] missing GC_WEBHOOK_SECRET');
            return res.status(500).json({ ok: false, error: 'missing_gc_webhook_secret' });
        }

        if (!gcVerifyWebhookSignature(rawBody, signature)) {
            if (isProd) {
                logger.warn('[gocardless] invalid signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            logger.warn('[gocardless] signature verification skipped (non-production or secret not set)');
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

            logger.debug('[gocardless] processing event', {
                type: `${resource_type}.${action}`,
                eventId: redactId(eventId),
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
                    logger.debug('[gocardless] unhandled event', { type: `${resource_type}.${action}` });
            }
        }

        res.json({ received: true });
    } catch (error) {
        logger.error('[gocardless] webhook handler error', { message: (error as any)?.message ?? String(error) });
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

async function handleMandateActive(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const mandateId = links?.mandate;
        if (!mandateId) {
            logger.warn('[gocardless] mandates.active missing mandate_id');
            return;
        }

        // 1) Look up mandate -> customer via GoCardless API
        let customerId: string | null = null;
        try {
            const mandateRes = await gcGetMandate(String(mandateId));
            customerId = mandateRes?.customer_id ?? null;
        } catch (e) {
            logger.warn('[gocardless] mandates.active failed to fetch mandate', { message: (e as any)?.message ?? String(e) });
            // Fallback: try webhook links (though they're usually empty for mandates.active)
            customerId = links?.customer ?? null;
        }

        if (!customerId) {
            logger.warn('[gocardless] mandates.active missing customer_id', { mandateId: redactId(mandateId) });
            return;
        }

        // 2) Resolve user_id from customer_id, then UPSERT subscription
        const userLookup = await pool.query(
            `SELECT id FROM "user" WHERE gocardless_customer_id = $1 LIMIT 1`,
            [customerId]
        );

        const userId = userLookup.rows?.[0]?.id ?? null;

        if (!userId) {
            logger.warn('[gocardless] mandates.active unknown_customer_id', {
                customerId: redactId(customerId),
                mandateId: redactId(mandateId),
            });
            return; // Don't fail webhook, just log and return
        }

        // 3) Check for stale event (out-of-order protection)
        if (eventContext.eventCreatedAt) {
            const staleCheck = await isStaleWebhookEvent(userId, eventContext.eventCreatedAt, eventContext.eventId);
            if (staleCheck.isStale) {
                logger.warn('[gocardless] mandates.active stale event ignored', {
                    userId,
                    eventId: redactId(eventContext.eventId),
                    eventCreatedAt: eventContext.eventCreatedAt,
                    lastEventCreatedAt: staleCheck.lastEventCreatedAt,
                    lastEventId: redactId(staleCheck.lastEventId),
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
            logger.warn('[gocardless] mandates.active plan linkage failed', { userId, message: (e as any)?.message ?? String(e) });
        }

        logger.info('[gocardless] mandates.active attached mandate', {
            userId,
            mandateId: redactId(mandateId),
            customerId: redactId(customerId),
        });
    } catch (error) {
        logger.error('[gocardless] mandates.active handler error', { message: (error as any)?.message ?? String(error) });
    }
}

async function handlePaymentConfirmed(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const paymentId = links.payment;
        if (!paymentId) {
            logger.error('[gocardless] payments.confirmed missing payment_id');
            return;
        }

        logger.info('[gocardless] payments.confirmed processing', { paymentId: redactId(paymentId) });

        // If we already linked the payment to an invoice in /internal/billing/run, mark it paid directly.
        // This avoids period math issues and guarantees the right invoice is updated.
        try {
            const invByPayment = await pool.query(
                `SELECT id, user_id, period_start, period_end, billing_interval, currency
                 FROM invoices
                 WHERE gocardless_payment_id = $1
                 LIMIT 1`,
                [paymentId]
            );
            if (invByPayment.rows.length > 0) {
                const inv = invByPayment.rows[0];
                const billingInterval = (String(inv.billing_interval || 'monthly').toLowerCase() === 'annual' || String(inv.billing_interval || '').toLowerCase() === 'year')
                    ? 'annual'
                    : 'monthly';
                const currency = String(inv.currency || 'GBP');

                // Re-run invoice generation for the stored period to attach any last-minute charges and recompute totals (idempotent).
                try {
                    await generateInvoiceForPeriod({
                        userId: Number(inv.user_id),
                        periodStart: String(inv.period_start),
                        periodEnd: String(inv.period_end),
                        billingInterval,
                        currency,
                        gocardlessPaymentId: paymentId,
                    });
                } catch (e) {
                    logger.warn('[gocardless] recompute invoice on payment.confirmed failed', { message: (e as any)?.message ?? String(e) });
                }

                await pool.query(
                    `UPDATE invoices SET status = 'paid', gocardless_payment_id = COALESCE(gocardless_payment_id, $1) WHERE id = $2`,
                    [paymentId, inv.id]
                );

                // Send invoice sent email (non-blocking)
                try {
                    const invoiceResult = await pool.query(
                        `SELECT invoice_number, amount_pence, currency FROM invoices WHERE id = $1`,
                        [inv.id]
                    );
                    const invoice = invoiceResult.rows[0];
                    const userResult = await pool.query('SELECT email, first_name, name FROM "user" WHERE id = $1', [inv.user_id]);
                    const user = userResult.rows[0];

                    if (user?.email && invoice) {
                        const amount = invoice.amount_pence ? `£${(invoice.amount_pence / 100).toFixed(2)}` : '£0.00';
                        sendInvoiceSent({
                            email: user.email,
                            firstName: user.first_name,
                            name: user.name,
                            invoice_number: invoice.invoice_number || `INV-${inv.id}`,
                            amount,
                            cta_url: `${process.env.APP_BASE_URL || 'https://virtualaddresshub.co.uk'}/billing`,
                        }).catch((err) => {
                            logger.warn('[gocardless] invoice_sent_email_failed_nonfatal', {
                                invoiceId: inv.id,
                                message: err instanceof Error ? err.message : String(err),
                            });
                        });
                    }
                } catch (emailError) {
                    // Don't fail payment processing if email fails
                    logger.warn('[gocardless] invoice_sent_email_error', {
                        invoiceId: inv.id,
                        message: emailError instanceof Error ? emailError.message : String(emailError),
                    });
                }

                logger.info('[gocardless] marked invoice paid', { invoiceId: inv.id, userId: inv.user_id, paymentId: redactId(paymentId) });
                return;
            }
        } catch (e) {
            logger.warn('[gocardless] lookup invoice by payment failed', { message: (e as any)?.message ?? String(e) });
        }

        // Fetch payment details from GoCardless API
        let paymentDetails;
        try {
            paymentDetails = await gcGetPayment(paymentId);
            logger.debug('[gocardless] payment details fetched', { amountPence: paymentDetails.amount, currency: paymentDetails.currency });
        } catch (apiError) {
            logger.warn('[gocardless] failed to fetch payment from API', { paymentId: redactId(paymentId), message: (apiError as any)?.message ?? String(apiError) });
            // Continue with webhook data if API call fails
            paymentDetails = null;
        }

        // Find user ID from payment
        const userId = await findUserIdForPayment(pool, paymentId, links);

        if (!userId) {
            logger.warn('[gocardless] could not find user for payment', { paymentId: redactId(paymentId) });
            return;
        }

        logger.info('[gocardless] resolved user for payment', { userId, paymentId: redactId(paymentId) });

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
            logger.warn('[gocardless] plan linkage missing in live environment', { userId, message: (e as any)?.message ?? String(e) });
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
        logger.debug('[gocardless] billing period resolved', { userId, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() });

        // Get payment amount (from API or webhook)
        const amountPence = paymentDetails?.amount ?? links.amount ?? 997; // Fallback to £9.97
        const currency = paymentDetails?.currency ?? 'GBP';

        // If invoice wasn't linked in /internal/billing/run, fall back to legacy behaviour:
        // resolve user and period, attach charges, and mark the period invoice as paid (no email).
        try {
            const invoiceResult = await generateInvoiceForPeriod({
                userId,
                periodStart,
                periodEnd,
                billingInterval: 'monthly',
                currency,
                gocardlessPaymentId: paymentId,
            });

            await pool.query(
                `UPDATE invoices 
                 SET status = 'paid', gocardless_payment_id = COALESCE(gocardless_payment_id, $1)
                 WHERE id = $2`,
                [paymentId, invoiceResult.invoiceId]
            );

            // Send invoice sent email (non-blocking)
            try {
                const invoiceResult2 = await pool.query(
                    `SELECT invoice_number, amount_pence, currency FROM invoices WHERE id = $1`,
                    [invoiceResult.invoiceId]
                );
                const invoice = invoiceResult2.rows[0];
                const userResult = await pool.query('SELECT email, first_name, name FROM "user" WHERE id = $1', [userId]);
                const user = userResult.rows[0];

                if (user?.email && invoice) {
                    const amount = invoice.amount_pence ? `£${(invoice.amount_pence / 100).toFixed(2)}` : '£0.00';
                    sendInvoiceSent({
                        email: user.email,
                        firstName: user.first_name,
                        name: user.name,
                        invoice_number: invoice.invoice_number || `INV-${invoiceResult.invoiceId}`,
                        amount,
                        cta_url: `${process.env.APP_BASE_URL || 'https://virtualaddresshub.co.uk'}/billing`,
                    }).catch((err) => {
                        logger.warn('[gocardless] invoice_sent_email_failed_nonfatal_fallback', {
                            invoiceId: invoiceResult.invoiceId,
                            message: err instanceof Error ? err.message : String(err),
                        });
                    });
                }
            } catch (emailError) {
                // Don't fail payment processing if email fails
                logger.warn('[gocardless] invoice_sent_email_error_fallback', {
                    invoiceId: invoiceResult.invoiceId,
                    message: emailError instanceof Error ? emailError.message : String(emailError),
                });
            }

            logger.info('[gocardless] marked period invoice paid (fallback)', {
                userId,
                invoiceId: invoiceResult.invoiceId,
                paymentId: redactId(paymentId),
            });
        } catch (invoiceError) {
            logger.error('[gocardless] failed to mark invoice paid (fallback)', {
                paymentId: redactId(paymentId),
                message: (invoiceError as any)?.message ?? String(invoiceError),
            });
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

        logger.info('[gocardless] payment confirmed processed', { paymentId: redactId(paymentId), userId });
    } catch (error) {
        logger.error('[gocardless] payment.confirmed handler error', { message: (error as any)?.message ?? String(error) });
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
                    logger.warn('[gocardless] payments.failed stale event ignored', {
                        userId,
                        paymentId: redactId(paymentId),
                        eventId: redactId(eventContext.eventId),
                        eventCreatedAt: eventContext.eventCreatedAt,
                        lastEventCreatedAt: staleCheck.lastEventCreatedAt,
                        lastEventId: redactId(staleCheck.lastEventId),
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

            logger.info('[gocardless] payment failed processed', { paymentId: redactId(paymentId), userId });

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
                logger.warn('[gocardless] failed to send payment failed email', {
                    paymentId: redactId(paymentId),
                    message: (emailErr as any)?.message ?? String(emailErr),
                });
            }
        }
    } catch (error) {
        logger.error('[gocardless] payment.failed handler error', { message: (error as any)?.message ?? String(error) });
    }
}

async function handleSubscriptionUpdated(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        const subscriptionId = links.subscription;
        // Update subscription details from GoCardless
        logger.debug('[gocardless] subscription updated', { subscriptionId: redactId(subscriptionId) });
    } catch (error) {
        logger.error('[gocardless] subscription.updated handler error', { message: (error as any)?.message ?? String(error) });
    }
}

async function handleBillingRequestPayerConfirmed(pool: any, links: any, eventContext: { eventId?: string; eventCreatedAt?: string; eventType: string }) {
    try {
        // Extract all possible identifiers from webhook payload
        const flowId = links?.billing_request_flow ?? links?.billing_request_flow_id ?? null;
        const billingRequestId = links?.billing_request ?? links?.billing_request_id ?? null;
        const customerId = links?.customer ?? null;

        if (!customerId) {
            logger.warn('[gocardless] payer_details_confirmed missing customer_id', {
                flowId: redactId(flowId),
                billingRequestId: redactId(billingRequestId),
            });
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
            logger.warn('[gocardless] payer_details_confirmed: gc_billing_request_flow_lookup_failed', {
                message: (e as any)?.message ?? String(e),
            });
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
            logger.warn('[gocardless] payer_details_confirmed: could_not_resolve_user', {
                flowId: redactId(flowId),
                billingRequestId: redactId(billingRequestId),
                customerId: redactId(customerId),
                tried: [
                    'gc_billing_request_flow (flow_id)',
                    'gc_billing_request_flow (request_id)',
                    'gc_billing_request_flow (customer_id)',
                    'gc_redirect_flow',
                    'user.gocardless_customer_id',
                ],
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
                logger.warn('[gocardless] payer_details_confirmed: overwriting_user_customer_id', {
                    userId,
                    old: redactId(currentUserCustomerId),
                    new: redactId(customerId),
                    source: 'billing_request_id resolution'
                });
            }
            if (currentSubCustomerId && currentSubCustomerId !== customerId) {
                logger.warn('[gocardless] payer_details_confirmed: overwriting_subscription_customer_id', {
                    userId,
                    old: redactId(currentSubCustomerId),
                    new: redactId(customerId),
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

        logger.info('[gocardless] payer_details_confirmed: linked_customer_to_user', {
            userId,
            customerId: redactId(customerId),
        });
    } catch (e) {
        logger.error('[gocardless] payer_details_confirmed handler_error', { message: (e as any)?.message ?? String(e) });
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
                logger.warn('[gocardless] mandates.submitted hydrate_customer_failed', {
                    message: (e as any)?.message ?? String(e),
                });
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
        logger.error('[gocardless] mandates.submitted handler_error', { message: (e as any)?.message ?? String(e) });
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
            logger.warn('[gocardless] billing_requests.fulfilled missing_identifiers', {
                billingRequestId: redactId(billingRequestId),
                customerId: redactId(customerId),
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

                logger.info('[gocardless] billing_requests.fulfilled subscription_marked_active', {
                    userId,
                    customerId: redactId(customerId),
                    billingRequestId: redactId(billingRequestId),
                });
                return;
            } else {
                logger.warn('[gocardless] billing_requests.fulfilled unknown_customer_id', {
                    customerId: redactId(customerId),
                    billingRequestId: redactId(billingRequestId),
                });
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
                            logger.warn('[gocardless] billing_requests.fulfilled overwriting_user_customer_id', {
                                userId,
                                old: redactId(currentUserCustomerId),
                                new: redactId(eventCustomerId),
                                source: 'billing_request_id resolution'
                            });
                        }
                        if (currentSubCustomerId && currentSubCustomerId !== eventCustomerId) {
                            logger.warn('[gocardless] billing_requests.fulfilled overwriting_subscription_customer_id', {
                                userId,
                                old: redactId(currentSubCustomerId),
                                new: redactId(eventCustomerId),
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
                    logger.info('[gocardless] billing_requests.fulfilled subscription_marked_active_via_billing_request', {
                        userId,
                        billingRequestId: redactId(billingRequestId),
                        customerId: redactId(eventCustomerId),
                    });
                }
            } catch (e) {
                logger.warn('[gocardless] billing_requests.fulfilled lookup_by_billing_request_failed', {
                    message: (e as any)?.message ?? String(e),
                });
            }
        }
    } catch (error) {
        logger.error('[gocardless] billing_requests.fulfilled handler_error', {
            message: (error as any)?.message ?? String(error),
        });
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

        if (process.env.NODE_ENV !== 'production') {
            logger.debug('[gocardless] mandates.created processing', {
                mandateId: redactId(mandateId),
                customerId: redactId(customerId),
                billingRequestId: redactId(billingRequestId),
                hasResource: Boolean(resource),
            });
        }

        if (!mandateId) {
            logger.warn('[gocardless] mandates.created missing_mandateId');
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

                logger.info('[gocardless] mandates.created mandate_attached_active_by_customer', {
                    userId,
                    customerId: redactId(customerId),
                    mandateId: redactId(mandateId),
                });
                return;
            } else {
                logger.warn('[gocardless] mandates.created unknown_customer_id', {
                    customerId: redactId(customerId),
                    mandateId: redactId(mandateId),
                });
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
                            logger.warn('[gocardless] mandates.created overwriting_user_customer_id', {
                                userId,
                                old: redactId(currentUserCustomerId),
                                new: redactId(eventCustomerId),
                                source: 'billing_request_id resolution'
                            });
                        }
                        if (currentSubCustomerId && currentSubCustomerId !== eventCustomerId) {
                            logger.warn('[gocardless] mandates.created overwriting_subscription_customer_id', {
                                userId,
                                old: redactId(currentSubCustomerId),
                                new: redactId(eventCustomerId),
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

                    logger.info('[gocardless] mandates.created mandate_attached_active_by_billing_request', {
                        userId,
                        billingRequestId: redactId(billingRequestId),
                        mandateId: redactId(mandateId),
                        customerId: redactId(finalCustomerId),
                    });
                    return;
                } else {
                    logger.warn('[gocardless] mandates.created no_mapping_for_billing_request', {
                        billingRequestId: redactId(billingRequestId),
                        mandateId: redactId(mandateId),
                    });
                }
            } catch (e) {
                logger.warn('[gocardless] mandates.created lookup_by_billing_request_failed', {
                    message: (e as any)?.message ?? String(e),
                });
            }
        }

        logger.warn('[gocardless] mandates.created cannot_attach_missing_customer_or_billing_request', {
            mandateId: redactId(mandateId),
            customerId: redactId(customerId),
            billingRequestId: redactId(billingRequestId),
        });
    } catch (error) {
        logger.error('[gocardless] mandates.created handler_error', {
            message: (error as any)?.message ?? String(error),
        });
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
        logger.error('[gocardless] resolve_user_from_identifiers_error', {
            message: (error as any)?.message ?? String(error),
        });
        return null;
    }
}

// getUserIdFromPayment is now handled by findUserIdForPayment from invoices service

export default router;
