import { Router, Request, Response } from 'express';
import { getPool } from '../../lib/db';
import { gcVerifyWebhookSignature, gcCompleteFlow, gcGetPayment } from '../../lib/gocardless';
import {
    createInvoiceForPayment,
    getBillingPeriodForUser,
    findUserIdForPayment
} from '../../services/invoices';
import { sendInvoiceSent, sendPaymentFailed } from '../../lib/mailer';

const router = Router();

/**
 * POST /api/webhooks/gocardless
 * Handle GoCardless webhooks with raw body for signature verification
 */
router.post('/gocardless', async (req: Request, res: Response) => {
    try {
        // Get raw body for signature verification
        const rawBody = (req as any).rawBody || req.body?.toString?.() || JSON.stringify(req.body);
        const signature = req.headers['webhook-signature'] as string;

        // Verify webhook signature (always required in production)
        const isProd = process.env.NODE_ENV === 'production';
        if (!gcVerifyWebhookSignature(rawBody, signature)) {
            if (isProd) {
                console.error('[GoCardless webhook] Invalid signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.warn('[GoCardless webhook] Signature verification skipped (non-production or secret not set)');
        }

        const webhook = JSON.parse(rawBody);
        const { events } = webhook;

        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'Invalid webhook format' });
        }

        const pool = getPool();

        for (const event of events) {
            const { resource_type, action, links } = event;

            console.log(`[GoCardless webhook] Processing ${resource_type}.${action}`);

            switch (`${resource_type}.${action}`) {
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
        const userId = await getUserIdFromMandate(pool, mandateId);

        if (userId) {
            await pool.query(`
        UPDATE subscription 
        SET mandate_id = $1, status = 'active', updated_at = $2
        WHERE user_id = $3
      `, [mandateId, Date.now(), userId]);

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
        await pool.query(`
            UPDATE subscription 
            SET status = 'active', updated_at = $1
            WHERE user_id = $2
        `, [Date.now(), userId]);

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

async function getUserIdFromMandate(pool: any, mandateId: string): Promise<number | null> {
    try {
        const result = await pool.query(`
      SELECT user_id FROM subscription WHERE mandate_id = $1
    `, [mandateId]);

        return result.rows[0]?.user_id || null;
    } catch (error) {
        console.error('[GoCardless] Error getting user from mandate:', error);
        return null;
    }
}

// getUserIdFromPayment is now handled by findUserIdForPayment from invoices service

export default router;
