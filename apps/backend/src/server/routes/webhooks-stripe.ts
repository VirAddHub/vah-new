/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler. Raw body required. Signature verified.
 * Updates our DB from Stripe events.
 *
 * Reliability rules (tests: apps/backend/tests/journey/stripe-events.mjs):
 *  - Every event is logged, then processed inside one transaction. The log row becomes 'processed'
 *    only when the work committed; a failed attempt is rolled back, marked 'failed' and answered
 *    with 500 so Stripe retries it. A retry of an unfinished event is processed again.
 *  - Deliveries of the same event are serialised with an advisory lock, so concurrent duplicates
 *    cannot both do the work. Invoices are unique per Stripe invoice id; one subscription row per user.
 *  - The subscription row remembers the newest event applied. Older events never overwrite newer
 *    state, and 'cancelled' is final for that Stripe subscription id.
 *  - Payment facts only. Nothing here changes account standing (user.status, suspension, closure)
 *    or verification, so a payment can never unlock a suspended, closed or unverified account.
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getPool } from '../db';
import { verifyStripeWebhook, redactStripeId } from '../../lib/stripe';
import { getStripeConfig } from '../../config/billing';
import { getStripePriceId } from '../../lib/stripe';
import { sendInvoiceSent, sendPaymentFailed, sendPlanCancelled } from '../../lib/mailer';
import { insertPlanStatusEvent } from '../services/planStatusAudit';
import { logger } from '../../lib/logger';

const router = Router();

type Db = { query: (sql: string, args?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> };
type SubStatus = 'active' | 'past_due' | 'cancelled' | 'pending';
type AfterCommit = Array<() => Promise<void>>;
type Outcome = 'processed' | 'unmatched' | 'stale';
const FINAL_LOG_STATES = new Set(['processed', 'unmatched', 'stale']);

function mapStripeSubscriptionStatus(stripeStatus: string): SubStatus {
  const s = (stripeStatus || '').toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'cancelled' || s === 'incomplete_expired') return 'cancelled';
  return 'pending'; // incomplete, trialing, paused, unknown
}

const idOf = (v: any): string | null => (typeof v === 'string' ? v : v?.id ?? null);

/** Pull the ids and our own metadata out of whichever Stripe object the event carries. */
function refsOf(event: Stripe.Event) {
  const obj = (event.data?.object ?? {}) as any;
  const isSubscription = obj.object === 'subscription';
  const subDetails = obj.subscription_details ?? obj.parent?.subscription_details ?? null;
  const line = obj.lines?.data?.[0] ?? null;
  const metadata = { ...(line?.metadata ?? {}), ...(subDetails?.metadata ?? {}), ...(obj.metadata ?? {}) } as Record<string, string>;
  const subscriptionId = isSubscription ? obj.id : idOf(obj.subscription) ?? idOf(subDetails?.subscription) ?? idOf(line?.subscription) ?? null;
  const priceId = idOf(obj.items?.data?.[0]?.price) ?? idOf(line?.price) ?? idOf(line?.pricing?.price_details?.price) ?? null;
  const userId = metadata.userId != null && /^\d+$/.test(String(metadata.userId)) ? Number(metadata.userId) : null;
  const planId = metadata.planId ?? metadata.plan_id;
  const period = (metadata.billingPeriod ?? metadata.billing_period) as string | undefined;
  return {
    obj, metadataUserId: userId, customerId: idOf(obj.customer), subscriptionId, priceId,
    planId: planId != null && /^\d+$/.test(String(planId)) ? Number(planId) : null,
    billingPeriod: period === 'annual' || period === 'monthly' ? period : null,
  };
}

/**
 * Which user does this event belong to? Our own metadata first, then the Stripe ids we stored.
 * If the metadata names one user but the Stripe customer already belongs to another, the event
 * is refused: one customer's payment must never activate another customer's account.
 */
async function resolveUser(db: Db, event: Stripe.Event): Promise<{ userId: number | null; mismatch: boolean }> {
  const r = refsOf(event);
  let byCustomer: number | null = null;
  if (r.customerId) {
    const q = await db.query(`SELECT id FROM "user" WHERE stripe_customer_id = $1 LIMIT 1`, [r.customerId]);
    if (q.rows.length) byCustomer = Number(q.rows[0].id);
  }
  if (r.metadataUserId != null) {
    if (byCustomer != null && byCustomer !== r.metadataUserId) return { userId: null, mismatch: true };
    const u = await db.query(`SELECT id, stripe_customer_id FROM "user" WHERE id = $1 LIMIT 1`, [r.metadataUserId]);
    if (!u.rows.length) return { userId: null, mismatch: false };
    const known = u.rows[0].stripe_customer_id as string | null;
    if (known && r.customerId && known !== r.customerId) return { userId: null, mismatch: true };
    return { userId: r.metadataUserId, mismatch: false };
  }
  if (r.subscriptionId) {
    const q = await db.query(`SELECT user_id FROM subscription WHERE stripe_subscription_id = $1 LIMIT 1`, [r.subscriptionId]);
    if (q.rows.length) return { userId: Number(q.rows[0].user_id), mismatch: false };
  }
  return { userId: byCustomer, mismatch: false };
}

const cadenceOf = (interval: string): 'monthly' | 'annual' | null => {
  const v = String(interval || '').toLowerCase();
  if (v === 'month' || v === 'monthly') return 'monthly';
  if (v === 'year' || v === 'annual' || v === 'yearly') return 'annual';
  return null;
};

/**
 * The plan that was actually paid for. A plan id from checkout metadata must exist and match the
 * billing period; otherwise the Stripe price id decides. Returns null when neither identifies a plan.
 */
async function resolvePlan(db: Db, r: ReturnType<typeof refsOf>): Promise<{ id: number; name: string; cadence: 'monthly' | 'annual' } | null | 'invalid'> {
  const priceCadence: 'monthly' | 'annual' | null =
    r.priceId && r.priceId === getStripePriceId('monthly') ? 'monthly' : r.priceId && r.priceId === getStripePriceId('annual') ? 'annual' : null;
  const wanted = r.billingPeriod ?? priceCadence;
  if (r.planId != null) {
    const q = await db.query(`SELECT id, name, interval, active FROM plans WHERE id = $1 LIMIT 1`, [r.planId]);
    const p = q.rows[0];
    if (!p || p.active !== true) return 'invalid';
    const cadence = cadenceOf(p.interval);
    if (!cadence || (wanted && wanted !== cadence)) return 'invalid';
    return { id: Number(p.id), name: p.name, cadence };
  }
  if (priceCadence) {
    const q = await db.query(
      `SELECT id, name, interval FROM plans WHERE active = true AND interval = ANY($1) ORDER BY sort ASC, id ASC LIMIT 1`,
      [priceCadence === 'monthly' ? ['month', 'monthly'] : ['year', 'annual', 'yearly']]);
    if (q.rows.length) return { id: Number(q.rows[0].id), name: q.rows[0].name, cadence: priceCadence };
  }
  return null;
}

interface StateChange {
  userId: number; status: SubStatus; stripeSubscriptionId: string | null; customerId: string | null;
  plan: { id: number; name: string; cadence: 'monthly' | 'annual' } | null;
  paidThroughMs?: number | null; cancelAtPeriodEnd?: boolean; event: Stripe.Event; reason: string;
}

/**
 * Apply a payment state to the user's single subscription row, respecting event order.
 * Returns 'stale' when the event is older than state already applied, or arrives for a Stripe
 * subscription that has already been cancelled.
 */
async function applySubscriptionState(db: Db, c: StateChange, after: AfterCommit): Promise<Outcome> {
  const eventMs = (c.event.created || 0) * 1000;
  const cur = (await db.query(`SELECT * FROM subscription WHERE user_id = $1 FOR UPDATE`, [c.userId])).rows[0];
  const now = Date.now();

  // A paid-through date is a fact about money already received: keep the latest one even when the
  // event that carries it is otherwise out of date.
  const paidThrough = Math.max(Number(cur?.paid_through_ms || 0), Number(c.paidThroughMs || 0)) || null;

  const sameSub = !!cur?.stripe_subscription_id && !!c.stripeSubscriptionId && cur.stripe_subscription_id === c.stripeSubscriptionId;
  const otherSub = !!cur?.stripe_subscription_id && !!c.stripeSubscriptionId && cur.stripe_subscription_id !== c.stripeSubscriptionId;
  const curEventMs = cur?.last_event_created_at ? new Date(cur.last_event_created_at).getTime() : 0;

  let stale = false;
  if (cur && sameSub && cur.status === 'cancelled' && c.status !== 'cancelled') stale = true;      // cancelled is final for this subscription
  else if (cur && otherSub && c.status === 'cancelled') stale = true;                                // an old subscription ending must not cancel the current one
  else if (cur && otherSub && eventMs < curEventMs) stale = true;                                    // late event from a previous subscription
  else if (cur && sameSub && eventMs < curEventMs) stale = true;                                     // older than what we already applied
  if (stale) {
    if (cur && paidThrough && paidThrough !== Number(cur.paid_through_ms || 0)) {
      await db.query(`UPDATE subscription SET paid_through_ms = $1, updated_at = $2 WHERE user_id = $3`, [paidThrough, now, c.userId]);
    }
    return 'stale';
  }

  // 'pending' (incomplete, trialing) never downgrades a subscription Stripe has already reported paid.
  let status: SubStatus = c.status;
  if (status === 'pending' && cur && sameSub && (cur.status === 'active' || cur.status === 'past_due')) status = cur.status;

  const stripeSubId = c.stripeSubscriptionId ?? cur?.stripe_subscription_id ?? null;
  if (status === 'active' && !stripeSubId) throw new Error('active_without_stripe_subscription');

  const planName = c.plan?.name ?? cur?.plan_name ?? null;
  const cadence = c.plan?.cadence ?? cur?.cadence ?? null;
  if (!cur && (!planName || !cadence)) throw new Error('plan_unknown_for_new_subscription');

  await db.query(
    `INSERT INTO subscription (user_id, plan_name, cadence, status, stripe_subscription_id, stripe_customer_id, customer_id,
                               paid_through_ms, cancel_at_period_end, last_event_created_at, last_event_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,to_timestamp($9::double precision / 1000),$10,$11,$11)
     ON CONFLICT (user_id) DO UPDATE SET
       plan_name = EXCLUDED.plan_name, cadence = EXCLUDED.cadence, status = EXCLUDED.status,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscription.stripe_customer_id),
       customer_id = COALESCE(EXCLUDED.customer_id, subscription.customer_id),
       paid_through_ms = GREATEST(subscription.paid_through_ms, EXCLUDED.paid_through_ms),
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       last_event_created_at = EXCLUDED.last_event_created_at, last_event_id = EXCLUDED.last_event_id,
       updated_at = EXCLUDED.updated_at`,
    [c.userId, planName, cadence, status, stripeSubId, c.customerId, paidThrough,
     c.cancelAtPeriodEnd ?? (sameSub ? cur?.cancel_at_period_end === true : false), eventMs, c.event.id, now]);

  // Display copies on the user row. Access is decided from the subscription row (services/access.ts).
  const sets = ['plan_status = $2', 'subscription_status = $2', 'updated_at = $3', 'stripe_customer_id = COALESCE(stripe_customer_id, $4)'];
  const args: unknown[] = [c.userId, status, now, c.customerId];
  if (c.plan) { args.push(c.plan.id); sets.push(`plan_id = $${args.length}`); }
  if (status === 'active') sets.push('plan_start_date = COALESCE(plan_start_date, $3)', 'payment_failed_at = NULL', 'payment_retry_count = 0', 'payment_grace_until = NULL');
  await db.query(`UPDATE "user" SET ${sets.join(', ')} WHERE id = $1`, args);

  const oldStatus = cur?.status ?? null;
  if (oldStatus !== status) {
    const subscriptionId = cur?.id ?? null;
    after.push(() => insertPlanStatusEvent({
      userId: c.userId, subscriptionId, oldStatus, newStatus: status, reason: c.reason,
      metadata: { stripe_event_id: c.event.id, stripe_subscription_id: stripeSubId },
    }));
  }
  return 'processed';
}

const appUrl = () => (getStripeConfig().appUrl || 'https://virtualaddresshub.co.uk').replace(/\/+$/, '');

async function handleCheckoutSessionCompleted(db: Db, event: Stripe.Event, userId: number, after: AfterCommit): Promise<Outcome> {
  const r = refsOf(event); const session = r.obj as Stripe.Checkout.Session;
  if (session.mode !== 'subscription') return 'processed';
  const plan = await resolvePlan(db, r);
  if (plan === 'invalid') throw new Error('plan_invalid_for_checkout');
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  return applySubscriptionState(db, {
    userId, status: paid ? 'active' : 'pending', stripeSubscriptionId: r.subscriptionId, customerId: r.customerId,
    plan, event, reason: 'stripe_checkout_completed',
  }, after);
}

async function handleSubscriptionChanged(db: Db, event: Stripe.Event, userId: number, after: AfterCommit): Promise<Outcome> {
  const r = refsOf(event); const sub = r.obj as Stripe.Subscription;
  const plan = await resolvePlan(db, r);
  if (plan === 'invalid') throw new Error('plan_invalid_for_subscription');
  const deleted = event.type === 'customer.subscription.deleted';
  const status: SubStatus = deleted ? 'cancelled' : mapStripeSubscriptionStatus(sub.status);
  const before = (await db.query(`SELECT status FROM subscription WHERE user_id = $1`, [userId])).rows[0]?.status ?? null;
  const outcome = await applySubscriptionState(db, {
    userId, status, stripeSubscriptionId: sub.id, customerId: r.customerId, plan,
    cancelAtPeriodEnd: deleted ? false : sub.cancel_at_period_end === true, event, reason: `stripe_${event.type}`,
  }, after);
  if (outcome === 'processed' && status === 'cancelled' && (before === 'active' || before === 'past_due')) {
    after.push(async () => {
      const u = (await getPool().query('SELECT email, first_name, name FROM "user" WHERE id = $1', [userId])).rows[0];
      if (u?.email) await sendPlanCancelled({ email: u.email, firstName: u.first_name, name: u.name, cta_url: `${appUrl()}/billing` });
    });
  }
  return outcome;
}

async function handleInvoicePaid(db: Db, event: Stripe.Event, userId: number, after: AfterCommit): Promise<Outcome> {
  const r = refsOf(event); const invoice = r.obj as any;
  const line = invoice.lines?.data?.[0];
  const startS = line?.period?.start ?? invoice.period_start ?? null;
  const endS = line?.period?.end ?? invoice.period_end ?? null;
  const day = (s: number | null) => (s ? new Date(s * 1000) : new Date()).toISOString().slice(0, 10);
  const periodStart = day(startS), periodEnd = day(endS ?? startS);
  const amountPence = invoice.amount_paid ?? 0;
  const currency = (invoice.currency && String(invoice.currency).toUpperCase()) || 'GBP';
  const paymentIntentId = idOf(invoice.payment_intent);

  const plan = await resolvePlan(db, r);
  if (plan === 'invalid') throw new Error('plan_invalid_for_invoice');
  const curCadence = (await db.query(`SELECT cadence FROM subscription WHERE user_id = $1`, [userId])).rows[0]?.cadence ?? null;
  const interval = plan?.cadence ?? curCadence ?? 'monthly';

  // Subscription first: if the payment cannot be attached to a subscription the whole event fails and is retried.
  const outcome = await applySubscriptionState(db, {
    userId, status: 'active', stripeSubscriptionId: r.subscriptionId, customerId: r.customerId, plan,
    paidThroughMs: endS ? endS * 1000 : null, event, reason: 'stripe_invoice_paid',
  }, after);

  // The invoice is a financial record: stored once per Stripe invoice id even if the event is stale.
  const existing = await db.query(`SELECT id FROM invoices WHERE stripe_invoice_id = $1 LIMIT 1`, [invoice.id]);
  let ourInvoiceId: number; let created = false;
  if (existing.rows.length > 0) {
    ourInvoiceId = Number(existing.rows[0].id);
    await db.query(
      `UPDATE invoices SET status = 'paid', amount_pence = COALESCE(amount_pence, $1), currency = COALESCE(currency, $2),
              stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $3) WHERE id = $4`,
      [amountPence, currency, paymentIntentId, ourInvoiceId]);
  } else {
    const year = new Date(periodEnd).getFullYear();
    const seqRes = await db.query(
      `INSERT INTO invoices_seq (year, sequence, created_at, updated_at) VALUES ($1, 1, $2, $2)
       ON CONFLICT (year) DO UPDATE SET sequence = invoices_seq.sequence + 1, updated_at = $2 RETURNING sequence`,
      [year, Date.now()]);
    const seq = seqRes.rows[0]?.sequence ?? 1;
    const invoiceNumber = `VAH-${year}-${String(seq).padStart(6, '0')}`;
    const ins = await db.query(
      `INSERT INTO invoices (user_id, invoice_number, amount_pence, period_start, period_end, status, created_at, number, billing_interval, currency, stripe_invoice_id, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8, $9, $10, $11) RETURNING id`,
      [userId, invoiceNumber, amountPence, periodStart, periodEnd, Date.now(), String(seq), interval, currency, invoice.id, paymentIntentId]);
    ourInvoiceId = Number(ins.rows[0].id); created = true;
  }

  if (created) {
    after.push(async () => {
      const pool = getPool();
      const u = (await pool.query('SELECT email, first_name, name FROM "user" WHERE id = $1', [userId])).rows[0];
      const inv = (await pool.query('SELECT invoice_number, amount_pence FROM invoices WHERE id = $1', [ourInvoiceId])).rows[0];
      if (u?.email && inv) {
        await sendInvoiceSent({
          email: u.email, firstName: u.first_name, name: u.name,
          invoice_number: inv.invoice_number || `INV-${ourInvoiceId}`,
          amount: inv.amount_pence ? `£${(Number(inv.amount_pence) / 100).toFixed(2)}` : '£0.00',
          cta_url: `${appUrl()}/billing`,
        });
      }
    });
  }
  return outcome;
}

async function handleInvoicePaymentFailed(db: Db, event: Stripe.Event, userId: number, after: AfterCommit): Promise<Outcome> {
  const r = refsOf(event);
  const cur = (await db.query(`SELECT status, stripe_subscription_id FROM subscription WHERE user_id = $1`, [userId])).rows[0];
  // A failed first payment (nothing active yet) leaves the account unpaid; it is not a renewal failure.
  if (!cur || cur.status === 'pending') return 'processed';
  const outcome = await applySubscriptionState(db, {
    userId, status: 'past_due', stripeSubscriptionId: r.subscriptionId ?? cur.stripe_subscription_id, customerId: r.customerId,
    plan: null, event, reason: 'stripe_invoice_payment_failed',
  }, after);
  if (outcome !== 'processed') return outcome;
  // No grace period (decision log 13): service continues only to the end of the period already paid for.
  await db.query(
    `UPDATE "user" SET payment_failed_at = COALESCE(payment_failed_at, $1), payment_retry_count = COALESCE(payment_retry_count, 0) + 1,
            payment_grace_until = NULL, updated_at = $1 WHERE id = $2`, [Date.now(), userId]);
  after.push(async () => {
    const u = (await getPool().query(`SELECT email, first_name, last_name, company_name FROM "user" WHERE id = $1`, [userId])).rows[0];
    if (u?.email) {
      await sendPaymentFailed({
        email: u.email, firstName: u.first_name,
        name: u.company_name || [u.first_name, u.last_name].filter(Boolean).join(' '), cta_url: `${appUrl()}/billing`,
      });
    }
  });
  return 'processed';
}

const HANDLERS: Record<string, (db: Db, e: Stripe.Event, userId: number, after: AfterCommit) => Promise<Outcome>> = {
  'checkout.session.completed': handleCheckoutSessionCompleted,
  'customer.subscription.created': handleSubscriptionChanged,
  'customer.subscription.updated': handleSubscriptionChanged,
  'customer.subscription.deleted': handleSubscriptionChanged,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
};

router.post('/stripe', async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody ?? (req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}), 'utf8'));
  const signature = (req.headers['stripe-signature'] as string) || null;
  const event = verifyStripeWebhook(rawBody, signature);
  if (!event) {
    logger.warn('[stripe] webhook signature invalid or missing');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const client = await getPool().connect();
  const after: AfterCommit = [];
  const now = Date.now();
  try {
    await client.query('BEGIN');
    // Serialise deliveries of the same event: a concurrent duplicate waits here, then sees the result.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`stripe:${event.id}`]);
    const seen = await client.query(`SELECT id, status FROM webhook_log WHERE provider = 'stripe' AND external_event_id = $1 LIMIT 1`, [event.id]);
    if (seen.rows.length && FINAL_LOG_STATES.has(seen.rows[0].status)) {
      await client.query('COMMIT');
      return res.status(200).json({ received: true, duplicate: true });
    }
    if (!seen.rows.length) {
      await client.query(
        `INSERT INTO webhook_log (source, event_type, payload_json, created_at, provider, status, payload, received_at_ms, external_event_id, event_created_ms)
         VALUES ('stripe', $1, '', $2, 'stripe', 'received', $3::jsonb, $2, $4, $5)`,
        [event.type, now, JSON.stringify({ id: event.id, type: event.type }), event.id, (event.created || 0) * 1000]);
    }

    let outcome: Outcome = 'processed';
    let failure: string | null = null;
    const handler = HANDLERS[event.type];
    if (handler) {
      await client.query('SAVEPOINT work');
      try {
        const who = await resolveUser(client, event);
        if (who.userId == null) {
          outcome = 'unmatched';
          logger.warn('[stripe] event unmatched', { type: event.type, eventId: redactStripeId(event.id), customerMismatch: who.mismatch });
        } else {
          // Serialise all events for one customer. Stripe sends e.g. invoice.paid and
          // customer.subscription.created within milliseconds; processed in parallel, both saw no
          // subscription row and the second overwrote the first (paid-through date lost on staging).
          await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`stripe-user:${who.userId}`]);
          outcome = await handler(client, event, who.userId, after);
        }
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT work');
        failure = (err as Error)?.message || 'handler_error';
      }
    } else {
      logger.debug('[stripe] unhandled event type', { type: event.type });
    }

    if (failure) {
      await client.query(
        `UPDATE webhook_log SET status = 'failed', attempts = attempts + 1, last_error = $1 WHERE provider = 'stripe' AND external_event_id = $2`,
        [failure.slice(0, 500), event.id]);
      await client.query('COMMIT');
      logger.error('[stripe] webhook handler error; event stays retryable', { type: event.type, eventId: redactStripeId(event.id), message: failure });
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
    await client.query(
      `UPDATE webhook_log SET status = $1, attempts = attempts + 1, last_error = NULL, processed_at_ms = $2 WHERE provider = 'stripe' AND external_event_id = $3`,
      [outcome, Date.now(), event.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('[stripe] webhook transaction failed; event stays retryable', { message: (err as Error)?.message });
    return res.status(500).json({ error: 'Webhook processing failed' });
  } finally {
    client.release();
  }

  // Emails and audit rows run once, after the state is safely committed. A failure here never undoes the payment state.
  for (const job of after) {
    try { await job(); } catch (e) { logger.warn('[stripe] post-commit job failed', { message: (e as Error)?.message }); }
  }
  return res.status(200).json({ received: true });
});

export default router;
