import { getPool } from '../db';
import { createStripePortalSession, getStripe } from '../../lib/stripe';
import type { Pool } from 'pg';

type StripeUserRow = {
  stripe_customer_id: string | null;
  email: string | null;
};

type StripeClient = NonNullable<ReturnType<typeof getStripe>>;

export interface BillingStripeDeps {
  pool: Pool;
  getStripeClient: () => StripeClient | null;
  createPortalSession: typeof createStripePortalSession;
  now: () => number;
  appUrl: string;
}

function getBillingStripeDeps(overrides?: Partial<BillingStripeDeps>): BillingStripeDeps {
  const appUrl = (
    process.env.APP_URL ||
    process.env.APP_BASE_URL ||
    'https://virtualaddresshub.co.uk'
  ).replace(/\/+$/, '');

  return {
    pool: getPool(),
    getStripeClient: () => getStripe(),
    createPortalSession: createStripePortalSession,
    now: () => Date.now(),
    appUrl,
    ...overrides,
  };
}

export type StripeCustomerResult =
  | { ok: true; customerId: string }
  | { ok: false; error: 'user_not_found' | 'stripe_not_configured' };

export async function getOrCreateStripeCustomerForUser(
  userId: number,
  deps?: Partial<BillingStripeDeps>
): Promise<StripeCustomerResult> {
  const { pool, getStripeClient, now } = getBillingStripeDeps(deps);
  const userResult = await pool.query<StripeUserRow>(
    `SELECT stripe_customer_id, email FROM "user" WHERE id = $1`,
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) {
    return { ok: false, error: 'user_not_found' };
  }

  if (user.stripe_customer_id) {
    return { ok: true, customerId: user.stripe_customer_id };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, error: 'stripe_not_configured' };
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    metadata: { userId: String(userId) },
  });

  await pool.query(
    `UPDATE "user" SET stripe_customer_id = $1, updated_at = $2 WHERE id = $3`,
    [customer.id, now(), userId]
  );

  return { ok: true, customerId: customer.id };
}

export async function createStripeBillingPortalLink(
  customerId: string,
  deps?: Partial<BillingStripeDeps>
): Promise<string> {
  const { appUrl, createPortalSession } = getBillingStripeDeps(deps);
  const { url } = await createPortalSession(customerId, `${appUrl}/account/billing`);
  return url;
}

export type CompleteSetupIntentResult =
  | { ok: true; defaultPaymentMethod: string }
  | { ok: false; error: 'stripe_customer_missing' }
  | { ok: false; error: 'setup_intent_not_succeeded'; status: string }
  | { ok: false; error: 'payment_method_missing' }
  | { ok: false; error: 'customer_mismatch'; customerId: string; siCustomer: string | null };

export async function completeStripeSetupIntentForUser(opts: {
  userId: number;
  setupIntentId: string;
}, deps?: Partial<BillingStripeDeps>): Promise<CompleteSetupIntentResult> {
  const { userId, setupIntentId } = opts;
  const { pool, getStripeClient } = getBillingStripeDeps(deps);
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('stripe_not_configured');
  }
  const userResult = await pool.query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM "user" WHERE id = $1`,
    [userId]
  );
  const user = userResult.rows[0];
  const customerId: string | null = user?.stripe_customer_id ?? null;
  if (!customerId) {
    return { ok: false, error: 'stripe_customer_missing' };
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== 'succeeded') {
    return {
      ok: false,
      error: 'setup_intent_not_succeeded',
      status: setupIntent.status,
    };
  }

  const pm =
    typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  if (!pm) {
    return { ok: false, error: 'payment_method_missing' };
  }

  const siCustomer =
    typeof setupIntent.customer === 'string'
      ? setupIntent.customer
      : setupIntent.customer?.id ?? null;
  if (!siCustomer || siCustomer !== customerId) {
    return { ok: false, error: 'customer_mismatch', customerId, siCustomer };
  }

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: pm,
    },
  });

  return { ok: true, defaultPaymentMethod: pm };
}
