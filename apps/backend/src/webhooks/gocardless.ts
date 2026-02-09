import type { Request, Response } from 'express';
import { getPool } from '../server/db';
import { gcVerifyWebhookSignature } from '../lib/gocardless';
import { sendWelcomeKycEmail } from '../lib/mailer';
import { logger } from '../lib/logger';

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

          // Clear payment failure state on successful payment
          await pool.query(`
            UPDATE "user" 
            SET payment_failed_at = NULL,
                payment_retry_count = 0,
                payment_grace_until = NULL,
                account_suspended_at = NULL,
                updated_at = $1
            WHERE id = $2
          `, [now, userId]);

          console.log(`[GoCardless Webhook] Created invoice and cleared payment failure state for user ${userId}`);
        }
        break;

      case 'payments.failed':
        // Handle payment failure with grace period
        const failedUserId = event.links?.customer_metadata?.user_id;
        if (failedUserId) {
          // Check if this is the first failure
          const userResult = await pool.query(`
            SELECT payment_failed_at, payment_retry_count 
            FROM "user" 
            WHERE id = $1
          `, [failedUserId]);

          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const isFirstFailure = !user.payment_failed_at;
            const retryCount = user.payment_retry_count || 0;

            if (isFirstFailure) {
              // First failure - start grace period (7 days)
              const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
              const graceUntil = now + gracePeriod;

              await pool.query(`
                UPDATE "user" 
                SET payment_failed_at = $1, 
                    payment_retry_count = 1,
                    payment_grace_until = $2,
                    updated_at = $3
                WHERE id = $4
              `, [now, graceUntil, now, failedUserId]);

              console.log(`[GoCardless Webhook] First payment failure for user ${failedUserId}, grace period until ${new Date(graceUntil).toISOString()}`);
            } else {
              // Subsequent failure - increment retry count
              await pool.query(`
                UPDATE "user" 
                SET payment_retry_count = $1,
                    updated_at = $2
                WHERE id = $3
              `, [retryCount + 1, now, failedUserId]);

              console.log(`[GoCardless Webhook] Payment retry ${retryCount + 1} failed for user ${failedUserId}`);
            }

            // UPSERT pattern: ensure subscription exists, update status
            await pool.query(`
                INSERT INTO subscription (user_id, status, updated_at)
                VALUES ($1, 'past_due', NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                  status = 'past_due',
                  updated_at = NOW()
            `, [failedUserId]);
          }
        }
        break;

      case 'subscriptions.updated':
        // Update subscription details
        const subUserId = event.links?.customer_metadata?.user_id;
        if (subUserId) {
          // UPSERT pattern: ensure subscription exists, update fields
          await pool.query(`
                INSERT INTO subscription (user_id, cadence, status, next_charge_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                  cadence = COALESCE(EXCLUDED.cadence, subscription.cadence),
                  status = COALESCE(EXCLUDED.status, subscription.status),
                  next_charge_at = COALESCE(EXCLUDED.next_charge_at, subscription.next_charge_at),
                  updated_at = NOW()
            `, [subUserId, event.details?.cadence ?? null, event.details?.status ?? null, event.details?.next_charge_at ?? null]);
          console.log(`[GoCardless Webhook] Updated subscription for user ${subUserId}`);
        }
        break;

      case 'mandates.active':
        // Update subscription with active mandate and activate user account
        const mandateUserId = event.links?.customer_metadata?.user_id;
        if (mandateUserId) {
          // Get user details before updating (for welcome email)
          const userResult = await pool.query(`
                SELECT email, first_name, last_name, status FROM "user" WHERE id = $1
            `, [mandateUserId]);
          const user = userResult.rows[0];
          const wasPendingPayment = user?.status === 'pending_payment';

          // UPSERT pattern: ensure subscription exists, update mandate and status
          await pool.query(`
                INSERT INTO subscription (user_id, mandate_id, status, updated_at)
                VALUES ($1, $2, 'active', NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                  mandate_id = COALESCE(EXCLUDED.mandate_id, subscription.mandate_id),
                  status = 'active',
                  updated_at = NOW()
            `, [mandateUserId, event.links?.mandate]);
          
          // Activate user account if it's in pending_payment status
          await pool.query(`
                UPDATE "user"
                SET status = 'active', updated_at = $1
                WHERE id = $2 AND status = 'pending_payment'
            `, [now, mandateUserId]);
          
          // Send welcome email only if account was just activated (was pending_payment)
          if (wasPendingPayment && user?.email) {
            const displayName =
              user.first_name?.trim() ||
              user.last_name?.trim() ||
              (user.email ? user.email.split("@")[0] : "") ||
              "there";
            sendWelcomeKycEmail({
              email: user.email,
              firstName: displayName,
            })
              .then(() => logger.info('[GoCardless Webhook] welcome_email_sent', { userId: mandateUserId }))
              .catch((emailError: any) => {
                logger.warn('[GoCardless Webhook] welcome_email_failed_nonfatal', {
                  userId: mandateUserId,
                  ...(process.env.NODE_ENV !== 'production' ? { email: user.email } : {}),
                  message: emailError?.message || String(emailError),
                });
              });
          }
          
          console.log(`[GoCardless Webhook] Activated mandate and account for user ${mandateUserId}`);
        }
        break;

      case 'mandates.revoked':
        // Remove mandate and mark as past_due
        const revokedUserId = event.links?.customer_metadata?.user_id;
        if (revokedUserId) {
          // UPSERT pattern: ensure subscription exists, remove mandate and update status
          await pool.query(`
                INSERT INTO subscription (user_id, mandate_id, status, updated_at)
                VALUES ($1, NULL, 'past_due', NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                  mandate_id = NULL,
                  status = 'past_due',
                  updated_at = NOW()
            `, [revokedUserId]);
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
