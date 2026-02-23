/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler. Raw body required. Signature verified.
 * Updates our DB from Stripe events; idempotent.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getPool } from '../db';
import { verifyStripeWebhook, redactStripeId } from '../../lib/stripe';
import { getStripeConfig } from '../../config/billing';
import { sendInvoiceSent, sendPaymentFailed, sendPlanCancelled } from '../../lib/mailer';
import { insertPlanStatusEvent } from '../services/planStatusAudit';
import { logger } from '../../lib/logger';

const router = Router();

function mapStripeSubscriptionStatus(stripeStatus: string): 'active' | 'past_due' | 'cancelled' | 'pending' {
  const s = (stripeStatus || '').toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'trialing') return 'pending';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'cancelled') return 'cancelled';
  return 'pending';
}

/**
 * Resolve user ID for a Stripe event. Tries: metadata.userId, subscription id, customer id.
 * Fail gracefully: returns null if unmatched (caller should log and store status=unmatched).
 */
async function resolveUserForStripeEvent(
  pool: any,
  event: Stripe.Event
): Promise<number | null> {
  const obj = event.data?.object as any;
  if (!obj) return null;
  const metadata = obj.metadata || {};
  const userId = metadata.userId != null ? Number(metadata.userId) : null;
  if (userId && Number.isInteger(userId)) return userId;

  const subId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
  if (subId) {
    const r = await pool.query(
      `SELECT user_id FROM subscription WHERE stripe_subscription_id = $1 LIMIT 1`,
      [subId]
    );
    if (r.rows?.length) return r.rows[0].user_id;
  }

  const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
  if (customerId) {
    const r = await pool.query(
      `SELECT id FROM "user" WHERE stripe_customer_id = $1 LIMIT 1`,
      [customerId]
    );
    if (r.rows?.length) return r.rows[0].id;
  }

  return null;
}

async function resolveUserIdFromInvoice(pool: any, invoice: Stripe.Invoice): Promise<number | null> {
  return resolveUserForStripeEvent(pool, { id: '', type: '', data: { object: invoice } } as unknown as Stripe.Event);
}

const EVENTS_REQUIRING_USER = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

router.post('/stripe', async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody ?? (req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}), 'utf8'));
  const signature = (req.headers['stripe-signature'] as string) || null;

  const event = verifyStripeWebhook(rawBody, signature);
  if (!event) {
    logger.warn('[stripe] webhook signature invalid or missing');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const pool = getPool();
  const now = Date.now();
  const safePayload = { id: event.id, type: event.type };

  try {
    const existing = await pool.query(
      `SELECT 1 FROM webhook_log WHERE provider = $1 AND external_event_id = $2 LIMIT 1`,
      ['stripe', event.id]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ received: true });
    }

    await pool.query(
      `INSERT INTO webhook_log (source, event_type, payload_json, created_at, provider, status, payload, received_at_ms, external_event_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
      [
        'stripe',
        event.type,
        '',
        now,
        'stripe',
        'received',
        JSON.stringify(safePayload),
        now,
        event.id,
      ]
    );
  } catch (e: any) {
    if (e?.code === '23505') {
      return res.status(200).json({ received: true });
    }
    logger.error('[stripe] webhook_log insert failed', { message: (e as Error).message });
  }

  if (EVENTS_REQUIRING_USER.includes(event.type)) {
    const userId = await resolveUserForStripeEvent(pool, event);
    if (userId == null) {
      logger.warn('[stripe] event unmatched (no user)', { type: event.type, eventId: redactStripeId(event.id) });
      await pool.query(
        `UPDATE webhook_log SET status = $1 WHERE provider = $2 AND external_event_id = $3`,
        ['unmatched', 'stripe', event.id]
      ).catch(() => {});
      return res.status(200).json({ received: true });
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(pool, event);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(pool, event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(pool, event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(pool, event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(pool, event);
        break;
      default:
        logger.debug('[stripe] unhandled event type', { type: event.type });
    }
  } catch (err) {
    logger.error('[stripe] webhook handler error', { message: (err as Error).message });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  return res.status(200).json({ received: true });
});

async function handleCheckoutSessionCompleted(pool: any, event: Stripe.Event) {
  const session = event.data?.object as Stripe.Checkout.Session;
  if (session.mode !== 'subscription') return;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const userId = session.metadata?.userId != null ? Number(session.metadata.userId) : null;
  if (!userId && !customerId) return;
  let uid = userId;
  if (!uid && customerId) {
    const r = await pool.query(
      `SELECT id FROM "user" WHERE stripe_customer_id = $1 LIMIT 1`,
      [customerId]
    );
    if (r.rows?.length) uid = r.rows[0].id;
  }
  if (!uid) return;
  if (customerId) {
    await pool.query(
      `UPDATE "user" SET stripe_customer_id = COALESCE(stripe_customer_id, $1), updated_at = $2 WHERE id = $3`,
      [customerId, Date.now(), uid]
    );
  }
  logger.info('[stripe] checkout.session.completed linked', { userId: uid, customerId: redactStripeId(customerId) });
}

async function handleSubscriptionUpsert(pool: any, event: Stripe.Event) {
  const uid = await resolveUserForStripeEvent(pool, event);
  if (uid == null) return;

  const sub = event.data?.object as Stripe.Subscription;
  const subId = sub.id;

  const status = mapStripeSubscriptionStatus(sub.status);
  const currentSub = await pool.query(
    `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
    [uid]
  );
  const oldStatus = currentSub.rows[0]?.status ?? null;
  const subscriptionId = currentSub.rows[0]?.id ?? null;

  await pool.query(
    `UPDATE subscription SET stripe_subscription_id = $1, status = $2, updated_at = $3 WHERE user_id = $4`,
    [subId, status, Date.now(), uid]
  );
  await pool.query(
    `UPDATE "user" SET subscription_status = $1, plan_status = $2, updated_at = $3 WHERE id = $4`,
    [status, status, Date.now(), uid]
  );

  if (oldStatus !== status) {
    await insertPlanStatusEvent({
      userId: uid,
      subscriptionId,
      oldStatus,
      newStatus: status,
      reason: `stripe_${event.type}`,
      metadata: { stripe_event_id: event.id, stripe_subscription_id: subId },
    });
  }
  logger.info('[stripe] subscription upserted', { userId: uid, status, subscriptionId: redactStripeId(subId) });
}

async function handleSubscriptionDeleted(pool: any, event: Stripe.Event) {
  const uid = await resolveUserForStripeEvent(pool, event);
  if (uid == null) return;

  const currentSub = await pool.query(
    `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
    [uid]
  );
  const oldStatus = currentSub.rows[0]?.status ?? null;
  const subscriptionId = currentSub.rows[0]?.id ?? null;

  await pool.query(
    `UPDATE subscription SET status = 'cancelled', updated_at = $1 WHERE user_id = $2`,
    [Date.now(), uid]
  );
  await pool.query(
    `UPDATE "user" SET plan_status = 'cancelled', subscription_status = 'cancelled', updated_at = $1 WHERE id = $2`,
    [Date.now(), uid]
  );

  await insertPlanStatusEvent({
    userId: uid,
    subscriptionId,
    oldStatus,
    newStatus: 'cancelled',
    reason: 'stripe_subscription_deleted',
    gocardlessEventId: null,
    gocardlessEventType: event.type,
    metadata: { stripe_event_id: event.id },
  });

  const shouldSendCancelledEmail = oldStatus === 'active' || oldStatus === 'past_due';
  if (shouldSendCancelledEmail) {
    try {
      const userResult = await pool.query(
        'SELECT email, first_name, name FROM "user" WHERE id = $1',
        [uid]
      );
      const user = userResult.rows[0];
      if (user?.email) {
        const appUrl = (getStripeConfig().appUrl || 'https://virtualaddresshub.co.uk').replace(/\/+$/, '');
        await sendPlanCancelled({
          email: user.email,
          firstName: user.first_name,
          name: user.name,
          cta_url: `${appUrl}/billing`,
        });
      }
    } catch (e) {
      logger.warn('[stripe] plan_cancelled email failed', { userId: uid });
    }
  }
  logger.info('[stripe] subscription deleted', { userId: uid });
}

async function handleInvoicePaid(pool: any, event: Stripe.Event) {
  const invoice = event.data?.object as Stripe.Invoice;
  const invoiceIdStripe = invoice.id;
  const uid = await resolveUserIdFromInvoice(pool, invoice);
  if (uid == null) return;

  let periodStart = invoice.period_start
    ? new Date((invoice.period_start as number) * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  let periodEnd = invoice.period_end
    ? new Date((invoice.period_end as number) * 1000).toISOString().slice(0, 10)
    : periodStart;
  const firstLine = invoice.lines?.data?.[0];
  if (firstLine?.period?.start != null && firstLine?.period?.end != null) {
    periodStart = new Date((firstLine.period.start as number) * 1000).toISOString().slice(0, 10);
    periodEnd = new Date((firstLine.period.end as number) * 1000).toISOString().slice(0, 10);
  }
  const amountPence = invoice.amount_paid ?? 0;
  const currency = (invoice.currency && String(invoice.currency).toUpperCase()) || 'GBP';
  const paymentIntentId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id ?? null;

  const existing = await pool.query(
    `SELECT id, status, invoice_number FROM invoices WHERE stripe_invoice_id = $1 LIMIT 1`,
    [invoiceIdStripe]
  );
  let ourInvoiceId: number;
  if (existing.rows.length > 0) {
    ourInvoiceId = existing.rows[0].id;
    await pool.query(
      `UPDATE invoices SET status = 'paid', amount_pence = COALESCE(amount_pence, $1), currency = COALESCE(currency, $2), stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $3), period_start = COALESCE(period_start, $4), period_end = COALESCE(period_end, $5) WHERE id = $6`,
      [amountPence, currency, paymentIntentId, periodStart, periodEnd, ourInvoiceId]
    );
  } else {
    const year = new Date(periodEnd).getFullYear();
    const seqRes = await pool.query(
      `INSERT INTO invoices_seq (year, sequence, created_at, updated_at)
       VALUES ($1, 1, $2, $2)
       ON CONFLICT (year) DO UPDATE SET sequence = invoices_seq.sequence + 1, updated_at = $2
       RETURNING sequence`,
      [year, Date.now()]
    );
    const seq = seqRes.rows[0]?.sequence ?? 1;
    const invoiceNumber = `VAH-${year}-${String(seq).padStart(6, '0')}`;
    const ins = await pool.query(
      `INSERT INTO invoices (user_id, invoice_number, amount_pence, period_start, period_end, status, created_at, number, billing_interval, currency, stripe_invoice_id, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, 'monthly', $8, $9, $10)
       RETURNING id`,
      [uid, invoiceNumber, amountPence, periodStart, periodEnd, Date.now(), String(seq), currency, invoiceIdStripe, paymentIntentId]
    );
    ourInvoiceId = ins.rows[0].id;
  }

  const subBefore = await pool.query(
    `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
    [uid]
  );
  const nowMs = Date.now();
  await pool.query(
    `UPDATE "user" SET plan_status = 'active', subscription_status = 'active', plan_start_date = COALESCE(plan_start_date, $1), payment_failed_at = NULL, payment_retry_count = 0, payment_grace_until = NULL, account_suspended_at = NULL, updated_at = $2 WHERE id = $3`,
    [nowMs, nowMs, uid]
  );
  await pool.query(
    `UPDATE subscription SET status = 'active', updated_at = $1 WHERE user_id = $2`,
    [nowMs, uid]
  );

  await insertPlanStatusEvent({
    userId: uid,
    subscriptionId: subBefore.rows[0]?.id ?? null,
    oldStatus: subBefore.rows[0]?.status ?? null,
    newStatus: 'active',
    reason: 'stripe_invoice_paid',
    gocardlessEventId: event.id,
    gocardlessEventType: event.type,
    metadata: { stripe_event_id: event.id },
  });

  try {
    const userResult = await pool.query(
      'SELECT email, first_name, name FROM "user" WHERE id = $1',
      [uid]
    );
    const invResult = await pool.query(
      'SELECT invoice_number, amount_pence FROM invoices WHERE id = $1',
      [ourInvoiceId]
    );
    const user = userResult.rows[0];
    const inv = invResult.rows[0];
    if (user?.email && inv) {
      const amount = inv.amount_pence ? `£${(Number(inv.amount_pence) / 100).toFixed(2)}` : '£0.00';
      const appUrl = (getStripeConfig().appUrl || 'https://virtualaddresshub.co.uk').replace(/\/+$/, '');
      await sendInvoiceSent({
        email: user.email,
        firstName: user.first_name,
        name: user.name,
        invoice_number: inv.invoice_number || `INV-${ourInvoiceId}`,
        amount,
        cta_url: `${appUrl}/billing`,
      });
    }
  } catch (e) {
    logger.warn('[stripe] invoice_sent email failed', { userId: uid, invoiceId: ourInvoiceId });
  }
  logger.info('[stripe] invoice.paid processed', { userId: uid, invoiceId: ourInvoiceId });
}

async function handleInvoicePaymentFailed(pool: any, event: Stripe.Event) {
  const invoice = event.data?.object as Stripe.Invoice;
  const uid = await resolveUserIdFromInvoice(pool, invoice);
  if (!uid) return;

  const userResult = await pool.query(
    `SELECT payment_failed_at, payment_retry_count FROM "user" WHERE id = $1`,
    [uid]
  );
  const user = userResult.rows[0];
  const isFirst = !user?.payment_failed_at;
  const retryCount = (user?.payment_retry_count || 0) + 1;
  const graceMs = 7 * 24 * 60 * 60 * 1000;
  const graceUntil = isFirst ? Date.now() + graceMs : user?.payment_grace_until ?? Date.now() + graceMs;

  await pool.query(
    `UPDATE "user" SET
       plan_status = 'past_due',
       subscription_status = 'past_due',
       payment_failed_at = COALESCE(payment_failed_at, $1),
       payment_retry_count = $2,
       payment_grace_until = $3,
       updated_at = $4
     WHERE id = $5`,
    [Date.now(), retryCount, graceUntil, Date.now(), uid]
  );
  await pool.query(
    `UPDATE subscription SET status = 'past_due', updated_at = $1 WHERE user_id = $2`,
    [Date.now(), uid]
  );

  const currentSub = await pool.query(
    `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
    [uid]
  );
  await insertPlanStatusEvent({
    userId: uid,
    subscriptionId: currentSub.rows[0]?.id ?? null,
    oldStatus: currentSub.rows[0]?.status ?? null,
    newStatus: 'past_due',
    reason: 'stripe_invoice_payment_failed',
    metadata: { stripe_event_id: event.id },
  });

  try {
    const u = await pool.query(
      `SELECT email, first_name, last_name, company_name FROM "user" WHERE id = $1 LIMIT 1`,
      [uid]
    );
    const row = u.rows[0];
    if (row?.email) {
      const appUrl = (getStripeConfig().appUrl || 'https://virtualaddresshub.co.uk').replace(/\/+$/, '');
      await sendPaymentFailed({
        email: row.email,
        firstName: row.first_name,
        name: row.company_name || [row.first_name, row.last_name].filter(Boolean).join(' '),
        cta_url: `${appUrl}/billing`,
      });
    }
  } catch (e) {
    logger.warn('[stripe] payment_failed email failed', { userId: uid });
  }
  logger.info('[stripe] invoice.payment_failed processed', { userId: uid });
}

export default router;
