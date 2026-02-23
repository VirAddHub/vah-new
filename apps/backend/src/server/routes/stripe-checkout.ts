/**
 * Stripe Checkout routes (subscription mode).
 *
 * POST /checkout-session           – redirect-based checkout (returns URL)
 * POST /checkout-session-embedded  – embedded checkout (returns client_secret)
 * GET  /session-status             – poll session status after completion
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { getStripe, getStripePriceId, redactStripeId } from '../../lib/stripe';
import { getStripeConfig } from '../../config/billing';
import { logger } from '../../lib/logger';

const router = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'unauthenticated' });
  }
  next();
}

export type CreateStripeCheckoutSessionBody = {
  plan_id?: string | number;
  billing_period?: 'monthly' | 'annual';
  success_url?: string;
  cancel_url?: string;
};

/* ------------------------------------------------------------------ */
/*  Shared: resolve or create Stripe customer for a user              */
/* ------------------------------------------------------------------ */
async function resolveStripeCustomer(userId: number) {
  const stripe = getStripe();
  if (!stripe) throw new Error('stripe_not_configured');

  const pool = getPool();
  const userResult = await pool.query(
    `SELECT id, email, stripe_customer_id, plan_id FROM "user" WHERE id = $1`,
    [userId]
  );
  if (userResult.rows.length === 0) throw new Error('user_not_found');
  const user = userResult.rows[0];
  const email = (user.email || '').trim();
  if (!email) throw new Error('user_email_required');

  let customerId: string | null = user.stripe_customer_id || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId: String(userId) },
    });
    customerId = customer.id;
    await pool.query(
      `UPDATE "user" SET stripe_customer_id = $1, updated_at = $2 WHERE id = $3`,
      [customerId, Date.now(), userId]
    );
    logger.info('[stripe] customer_created', { userId, customerId: redactStripeId(customerId) });
  }

  return { stripe, pool, user, email, customerId };
}

/* ------------------------------------------------------------------ */
/*  POST /checkout-session  (redirect mode – returns URL)             */
/* ------------------------------------------------------------------ */
export async function createStripeCheckoutSession(
  userId: number,
  body: CreateStripeCheckoutSessionBody
): Promise<{ url: string }> {
  const billingPeriod = (body.billing_period || 'monthly') === 'annual' ? 'annual' : 'monthly';
  const planId = body.plan_id != null ? Number(body.plan_id) : null;
  const { appUrl } = getStripeConfig();
  const successUrl = (body.success_url || `${appUrl}/billing`).trim();
  const cancelUrl = (body.cancel_url || `${appUrl}/billing`).trim();

  const priceId = getStripePriceId(billingPeriod);
  if (!priceId) throw new Error('missing_price');

  const { stripe, user, customerId } = await resolveStripeCustomer(userId);
  const effectivePlanId = planId ?? user.plan_id;
  if (effectivePlanId == null) throw new Error('plan_required');

  const meta = { userId: String(userId), planId: String(effectivePlanId), plan_id: String(effectivePlanId), billingPeriod, billing_period: billingPeriod };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: meta,
    subscription_data: { metadata: meta },
  });

  const url = session.url ?? null;
  if (!url) throw new Error('no_checkout_url');
  logger.info('[stripe] checkout_session_created', { userId, sessionId: redactStripeId(session.id) });
  return { url };
}

router.post('/checkout-session', requireAuth, async (req: Request, res: Response) => {
  const userId = Number(req.user!.id);
  const body = (req.body || {}) as CreateStripeCheckoutSessionBody;
  try {
    const { url } = await createStripeCheckoutSession(userId, body);
    return res.json({ ok: true, data: { url } });
  } catch (e: any) {
    const msg = (e && e.message) || 'checkout_failed';
    if (msg === 'stripe_not_configured') return res.status(503).json({ ok: false, error: msg });
    if (msg === 'missing_price' || msg === 'plan_required' || msg === 'user_email_required') {
      return res.status(400).json({ ok: false, error: msg });
    }
    if (msg === 'user_not_found') return res.status(404).json({ ok: false, error: msg });
    return res.status(500).json({ ok: false, error: 'checkout_failed' });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /checkout-session-embedded  (ui_mode: "embedded")            */
/*  Returns { ok, data: { client_secret } }                           */
/* ------------------------------------------------------------------ */
router.post('/checkout-session-embedded', requireAuth, async (req: Request, res: Response) => {
  const userId = Number(req.user!.id);
  const body = (req.body || {}) as CreateStripeCheckoutSessionBody;
  const billingPeriod = (body.billing_period || 'monthly') === 'annual' ? 'annual' : 'monthly';
  const planId = body.plan_id != null ? Number(body.plan_id) : null;

  try {
    const priceId = getStripePriceId(billingPeriod);
    if (!priceId) throw new Error('missing_price');

    const { appUrl } = getStripeConfig();
    const { stripe, user, customerId } = await resolveStripeCustomer(userId);
    const effectivePlanId = planId ?? user.plan_id;
    if (effectivePlanId == null) throw new Error('plan_required');

    const meta = { userId: String(userId), planId: String(effectivePlanId), plan_id: String(effectivePlanId), billingPeriod, billing_period: billingPeriod };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ui_mode: 'embedded',
      return_url: `${appUrl}/signup/payment-return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: meta,
      subscription_data: { metadata: meta },
    });

    logger.info('[stripe] embedded_checkout_created', { userId, sessionId: redactStripeId(session.id) });
    return res.json({ ok: true, data: { client_secret: session.client_secret } });
  } catch (e: any) {
    const msg = (e && e.message) || 'checkout_failed';
    logger.error('[stripe] embedded_checkout_error', { userId, error: msg });
    if (msg === 'stripe_not_configured') return res.status(503).json({ ok: false, error: msg });
    if (msg === 'missing_price' || msg === 'plan_required' || msg === 'user_email_required') {
      return res.status(400).json({ ok: false, error: msg });
    }
    if (msg === 'user_not_found') return res.status(404).json({ ok: false, error: msg });
    return res.status(500).json({ ok: false, error: 'checkout_failed' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /session-status?session_id=cs_xxx                             */
/*  Returns { ok, data: { status, payment_status, customer_email } }  */
/* ------------------------------------------------------------------ */
router.get('/session-status', requireAuth, async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string;
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'missing_session_id' });
  }
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error('stripe_not_configured');

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return res.json({
      ok: true,
      data: {
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email ?? null,
      },
    });
  } catch (e: any) {
    const msg = (e && e.message) || 'session_retrieval_failed';
    logger.error('[stripe] session_status_error', { sessionId: redactStripeId(sessionId), error: msg });
    return res.status(500).json({ ok: false, error: 'session_retrieval_failed' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /publishable-key                                              */
/*  Returns the publishable key so the frontend can load Stripe.js    */
/* ------------------------------------------------------------------ */
router.get('/publishable-key', (_req: Request, res: Response) => {
  const { publishableKey } = getStripeConfig();
  if (!publishableKey) {
    return res.status(503).json({ ok: false, error: 'stripe_not_configured' });
  }
  return res.json({ ok: true, data: { publishable_key: publishableKey } });
});

export default router;
