import { Router, Request, Response } from 'express';
import { getPool } from '../../lib/db';
import { gcVerifyWebhookSignature, gcCompleteFlow, gcGetPayment } from '../../lib/gocardless';
import { 
  createInvoiceForPayment, 
  getBillingPeriodForUser, 
  findUserIdForPayment 
} from '../../services/invoices';

const router = Router();

/**
 * POST /api/webhooks/gocardless
 * Handle GoCardless webhooks with raw body for signature verification
 */
router.post('/gocardless', async (req: Request, res: Response) => {
    try {
        // Get raw body for signature verification
        const rawBody = (req as any).rawBody || req.body?.toString?.() || '';
        const signature = req.headers['webhook-signature'] as string;

        // Verify webhook signature
        if (!gcVerifyWebhookSignature(rawBody, signature)) {
            console.error('[GoCardless webhook] Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
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
            console.error('[GoCardless] No payment ID in links');
            return;
        }

        // Fetch payment details from GoCardless API
        let paymentDetails;
        try {
            paymentDetails = await gcGetPayment(paymentId);
        } catch (apiError) {
            console.error(`[GoCardless] Failed to fetch payment ${paymentId}:`, apiError);
            // Continue with webhook data if API call fails
            paymentDetails = null;
        }

        // Find user ID from payment
        const userId = await findUserIdForPayment(pool, paymentId, links);

        if (!userId) {
            console.error(`[GoCardless] Could not find user for payment ${paymentId}`);
            return;
        }

        // Update subscription status
        await pool.query(`
            UPDATE subscription 
            SET status = 'active', updated_at = $1
            WHERE user_id = $2
        `, [Date.now(), userId]);

        // Get billing period
        const { periodStart, periodEnd } = await getBillingPeriodForUser(userId);

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

            console.log(`[GoCardless] Created invoice ${invoice.id} for payment ${paymentId} (user ${userId})`);
        } catch (invoiceError) {
            console.error(`[GoCardless] Failed to create invoice for payment ${paymentId}:`, invoiceError);
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

        console.log(`[GoCardless] Payment ${paymentId} confirmed for user ${userId}`);
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
