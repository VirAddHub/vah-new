import { Router, Request, Response } from 'express';
import { getPool } from '../../lib/db';
import { gcVerifyWebhookSignature, gcCompleteFlow, gcGetPayment, gcGetMandate } from '../../lib/gocardless';
import {
    createInvoiceForPayment,
    getBillingPeriodForUser,
    findUserIdForPayment
} from '../../services/invoices';
import { sendInvoiceSent, sendPaymentFailed } from '../../lib/mailer';
import { ensureUserPlanLinked } from '../services/plan-linking';
import { upsertSubscriptionForUser } from '../services/subscription-linking';

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
            const { resource_type, action, links } = event;

            console.log(`[GoCardless webhook] Processing ${resource_type}.${action}`);

            switch (`${resource_type}.${action}`) {
                case 'billing_requests.payer_details_confirmed':
                    await handleBillingRequestPayerConfirmed(pool, links);
                    break;

                case 'mandates.submitted':
                    await handleMandateSubmitted(pool, links);
                    break;

                case 'mandates.active':
                    await handleMandateActive(pool, links);
                    break;

                case 'payments.confirmed':
                    await handlePaymentConfirmed(pool, links);
                    break;

                case 'payments.failed':
                    await handlePaymentFailed(pool, links);
                    break;

                case 'subscriptions.updated':
                    await handleSubscriptionUpdated(pool, links);
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

async function handleMandateActive(pool: any, links: any) {
    try {
        const mandateId = links.mandate;
        let customerId = links.customer ?? null;

        // If webhook didn't include customer, try to hydrate via API (best-effort)
        if (!customerId && mandateId) {
            try {
                const m = await gcGetMandate(String(mandateId));
                customerId = m.customer_id ?? null;
            } catch (e) {
                // Test webhooks / placeholders often can't be fetched; ignore.
                console.warn('[GoCardless] mandate.active hydrate customer failed:', (e as any)?.message ?? e);
            }
        }

        const userId = await findUserIdForGcIdentifiers(pool, {
            customerId,
            mandateId,
        });

        if (userId) {
            // Update user core payment fields
            await pool.query(
                `
                UPDATE "user"
                SET
                    gocardless_mandate_id = COALESCE(gocardless_mandate_id, $1),
                    gocardless_customer_id = COALESCE(gocardless_customer_id, $2),
                    plan_status = 'active',
                    plan_start_date = COALESCE(plan_start_date, $3),
                    updated_at = $3
                WHERE id = $4
                `,
                [mandateId, customerId ?? null, Date.now(), userId]
            );

            // Ensure subscription row exists and is active
            await upsertSubscriptionForUser({
                pool,
                userId,
                status: 'active',
                mandateId,
                customerId,
            });

            // Persist plan_id linkage (fixes "Active" + "No plan")
            try {
                await ensureUserPlanLinked({ pool, userId, cadence: "monthly" });
            } catch (e) {
                console.error('[GoCardless] Plan linkage missing in live environment for user', userId, e);
            }

            console.log(`[GoCardless] Mandate ${mandateId} activated for user ${userId}`);
        }
    } catch (error) {
        console.error('[GoCardless] Error handling mandate.active:', error);
    }
}

async function handlePaymentConfirmed(pool: any, links: any) {
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
        if (links?.customer || links?.mandate) {
            await pool.query(
                `
                UPDATE "user"
                SET
                    gocardless_customer_id = COALESCE(gocardless_customer_id, $1),
                    gocardless_mandate_id = COALESCE(gocardless_mandate_id, $2),
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

        // Create invoice with PDF
        try {
            const invoice = await createInvoiceForPayment({
                userId,
                gocardlessPaymentId: paymentId,
                amountPence,
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

async function handlePaymentFailed(pool: any, links: any) {
    try {
        const paymentId = links.payment;
        const userId = await findUserIdForPayment(pool, paymentId, links);

        if (userId) {
            await pool.query(`
        UPDATE subscription 
        SET status = 'past_due', updated_at = $1
        WHERE user_id = $2
      `, [Date.now(), userId]);

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

async function handleSubscriptionUpdated(pool: any, links: any) {
    try {
        const subscriptionId = links.subscription;
        // Update subscription details from GoCardless
        console.log(`[GoCardless] Subscription ${subscriptionId} updated`);
    } catch (error) {
        console.error('[GoCardless] Error handling subscription.updated:', error);
    }
}

async function handleBillingRequestPayerConfirmed(pool: any, links: any) {
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

        // Store customer_id on user (never downgrade plan_status if already active)
        await pool.query(
            `
            UPDATE "user"
            SET
              gocardless_customer_id = COALESCE(gocardless_customer_id, $1),
              plan_id = COALESCE(plan_id, $2),
              plan_status = CASE WHEN plan_status = 'active' THEN plan_status ELSE 'pending_payment' END,
              updated_at = $3
            WHERE id = $4
            `,
            [String(customerId), planId, Date.now(), userId]
        );

        // Ensure subscription row exists and attach customer_id (creates if missing, never downgrades active)
        await upsertSubscriptionForUser({
            pool,
            userId,
            status: 'pending',
            customerId: String(customerId),
        });

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

async function handleMandateSubmitted(pool: any, links: any) {
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
        await pool.query(
            `
            UPDATE "user"
            SET
              gocardless_mandate_id = COALESCE(gocardless_mandate_id, $1),
              gocardless_customer_id = COALESCE(gocardless_customer_id, $2),
              plan_status = CASE WHEN plan_status = 'active' THEN plan_status ELSE 'pending_payment' END,
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
