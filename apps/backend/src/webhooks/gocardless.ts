import type { Request, Response } from 'express';
import { getPool } from '../server/db';
import { gcVerifyWebhookSignature } from '../lib/gocardless';

export async function handleGcWebhook(req: Request, res: Response) {
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  const sig = req.headers['webhook-signature'] as string | null;

  if (!gcVerifyWebhookSignature(typeof raw === 'string' ? raw : JSON.stringify(raw), sig)) {
    console.error('[GoCardless Webhook] Invalid signature');
    return res.status(400).json({ ok: false, error: 'bad_signature' });
  }

  const event = req.body;
  const type = `${event.resource_type}.${event.action}`;
  const now = Date.now();
  const pool = getPool();

  try {
    switch (type) {
      case 'payments.confirmed':
        // Create invoice record for confirmed payment
        const userId = event.links?.customer_metadata?.user_id;
        if (userId) {
          await pool.query(`
            INSERT INTO invoices (user_id, created_at, amount_pence, status, invoice_url)
            VALUES ($1, $2, $3, 'paid', $4)
          `, [
            userId,
            now,
            Math.round(Number(event.details?.amount) || 0),
            event.details?.invoice_url || null
          ]);
          console.log(`[GoCardless Webhook] Created invoice for user ${userId}`);
        }
        break;

      case 'payments.failed':
        // Update subscription status to past_due
        const failedUserId = event.links?.customer_metadata?.user_id;
        if (failedUserId) {
          await pool.query(`UPDATE subscription SET status='past_due', updated_at=$1 WHERE user_id=$2`, [now, failedUserId]);
          console.log(`[GoCardless Webhook] Marked subscription past_due for user ${failedUserId}`);
        }
        break;

      case 'subscriptions.updated':
        // Update subscription details
        const subUserId = event.links?.customer_metadata?.user_id;
        if (subUserId) {
          await pool.query(`UPDATE subscription SET cadence=COALESCE($1, cadence), status=COALESCE($2, status), next_charge_at=COALESCE($3, next_charge_at), updated_at=$4 WHERE user_id=$5`,
            [event.details?.cadence ?? null, event.details?.status ?? null, event.details?.next_charge_at ?? null, now, subUserId]);
          console.log(`[GoCardless Webhook] Updated subscription for user ${subUserId}`);
        }
        break;

      case 'mandates.active':
        // Update subscription with active mandate
        const mandateUserId = event.links?.customer_metadata?.user_id;
        if (mandateUserId) {
          await pool.query(`UPDATE subscription SET mandate_id=$1, status='active', updated_at=$2 WHERE user_id=$3`,
            [event.links?.mandate, now, mandateUserId]);
          console.log(`[GoCardless Webhook] Activated mandate for user ${mandateUserId}`);
        }
        break;

      case 'mandates.revoked':
        // Remove mandate and mark as past_due
        const revokedUserId = event.links?.customer_metadata?.user_id;
        if (revokedUserId) {
          await pool.query(`UPDATE subscription SET mandate_id=NULL, status='past_due', updated_at=$1 WHERE user_id=$2`,
            [now, revokedUserId]);
          console.log(`[GoCardless Webhook] Revoked mandate for user ${revokedUserId}`);
        }
        break;

      default:
        console.log(`[GoCardless Webhook] Unhandled event type: ${type}`);
        break;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('[GoCardless Webhook] Processing error:', error);
    res.status(500).json({ ok: false, error: 'webhook_processing_failed' });
  }
}
