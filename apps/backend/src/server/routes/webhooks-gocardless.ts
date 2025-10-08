import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { gcVerifyWebhookSignature, gcCompleteFlow } from '../../lib/gocardless';

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
    const userId = await getUserIdFromPayment(pool, paymentId);
    
    if (userId) {
      // Update subscription status
      await pool.query(`
        UPDATE subscription 
        SET status = 'active', updated_at = $1
        WHERE user_id = $2
      `, [Date.now(), userId]);
      
      // Create invoice record
      await pool.query(`
        INSERT INTO invoices (user_id, amount_pence, status, created_at)
        VALUES ($1, $2, 'paid', $3)
      `, [userId, 995, Date.now()]); // Default amount, should be from payment data
      
      console.log(`[GoCardless] Payment ${paymentId} confirmed for user ${userId}`);
    }
  } catch (error) {
    console.error('[GoCardless] Error handling payment.confirmed:', error);
  }
}

async function handlePaymentFailed(pool: any, links: any) {
  try {
    const paymentId = links.payment;
    const userId = await getUserIdFromPayment(pool, paymentId);
    
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

async function getUserIdFromPayment(pool: any, paymentId: string): Promise<number | null> {
  try {
    // This would need to be implemented based on how payments are linked to users
    // For now, return null as we don't have payment tracking yet
    return null;
  } catch (error) {
    console.error('[GoCardless] Error getting user from payment:', error);
    return null;
  }
}

export default router;
