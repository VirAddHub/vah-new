import { getPool } from '../db';
import { getBillingProvider } from '../../config/billing';
import { getStripe } from '../../lib/stripe';
import { logger } from '../../lib/logger';
import type { Pool } from 'pg';

type StripeClient = NonNullable<ReturnType<typeof getStripe>>;

type BillingSubscription = {
  status: string | null;
  cadence: string;
  next_charge_at: number | string | null;
  mandate_id: string | null;
  customer_id: string | null;
};

type BillingLatestInvoice = {
  id: number;
  invoice_number: string | null;
  amount_pence: number;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: number | string;
};

export interface BillingOverviewData {
  plan_status: string | null;
  subscription: BillingSubscription | null;
  latest_invoice: BillingLatestInvoice | null;
  plan_id: number | null;
  plan: string;
  cadence: 'monthly' | 'annual';
  status: string;
  account_status: 'active' | 'suspended' | 'grace_period' | 'past_due';
  grace_period: { days_left: number; retry_count: number; grace_until: number } | null;
  next_charge_at: number | string | null;
  next_billing_date: string | null;
  mandate_status: 'active' | 'missing';
  has_mandate: boolean;
  has_redirect_flow: boolean;
  redirect_flow_id: string | null;
  current_price_pence: number;
  latest_invoice_amount_pence: number;
  pending_forwarding_fees_pence: number;
  billing_provider: ReturnType<typeof getBillingProvider>;
}

export interface BillingOverviewDeps {
  pool: Pool;
  getProvider: typeof getBillingProvider;
  getStripeClient: () => StripeClient | null;
  now: () => number;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

function getBillingOverviewDeps(overrides?: Partial<BillingOverviewDeps>): BillingOverviewDeps {
  return {
    pool: getPool(),
    getProvider: getBillingProvider,
    getStripeClient: () => getStripe(),
    now: () => Date.now(),
    warn: (msg, meta) => logger.warn(msg, meta),
    error: (msg, meta) => logger.error(msg, meta),
    ...overrides,
  };
}

async function getPendingForwardingFees(
  userId: number,
  deps: BillingOverviewDeps
): Promise<number> {
  const { pool } = deps;
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount_pence), 0) as total_pence
       FROM charge
       WHERE user_id = $1
         AND status = 'pending'
         AND type = 'forwarding_fee'`,
      [userId]
    );
    return Number(result.rows[0]?.total_pence || 0);
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return 0;
    }
    deps.error('[billingOverview] pending_forwarding_fees_failed', {
      message: error?.message ?? String(error),
    });
    return 0;
  }
}

export async function getBillingOverviewData(
  userId: number,
  deps?: Partial<BillingOverviewDeps>
): Promise<BillingOverviewData> {
  const resolvedDeps = getBillingOverviewDeps(deps);
  const { pool, getProvider, getStripeClient, now, warn } = resolvedDeps;

  const subResult = await pool.query(`
    SELECT
      s.*,
      COALESCE(p1.name, p2.name) as plan_name,
      COALESCE(p1.price_pence, p2.price_pence) as price_pence,
      COALESCE(p1.interval, p2.interval) as plan_interval
    FROM subscription s
    LEFT JOIN "user" u ON u.id = s.user_id
    LEFT JOIN plans p1 ON s.plan_name = p1.name AND p1.active = true AND p1.retired_at IS NULL
    LEFT JOIN plans p2 ON u.plan_id = p2.id AND p2.active = true AND p2.retired_at IS NULL
    WHERE s.user_id=$1
    ORDER BY s.id DESC
    LIMIT 1
  `, [userId]);
  const sub = subResult.rows[0] || null;

  let stripeNextBillingDate: string | null = null;
  if (getProvider() === 'stripe' && sub?.stripe_subscription_id) {
    try {
      const stripe = getStripeClient();
      if (stripe) {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, { expand: [] });
        if (stripeSub.current_period_end) {
          stripeNextBillingDate = new Date(stripeSub.current_period_end * 1000).toISOString().slice(0, 10);
        }
      }
    } catch (e) {
      warn('[billingOverview] stripe_subscription_fetch_failed', {
        message: (e as any)?.message ?? String(e),
      });
    }
  }

  const latestInvoiceResult = await pool.query(`
    SELECT
      id,
      invoice_number,
      amount_pence,
      status,
      period_start,
      period_end,
      created_at
    FROM invoices
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId]);
  const latestInvoice = latestInvoiceResult.rows[0] || null;

  const userResult = await pool.query(`
    SELECT plan_id, plan_status, payment_failed_at, payment_retry_count, payment_grace_until, account_suspended_at,
           gocardless_mandate_id, gocardless_redirect_flow_id,
           stripe_customer_id
    FROM "user" WHERE id=$1
  `, [userId]);
  const user = userResult.rows[0];

  let resolvedPlan: { id: number; name: string; interval: string; price_pence: number } | null = null;
  const planId = user?.plan_id ? Number(user.plan_id) : null;

  if (planId) {
    try {
      const r = await pool.query(
        `SELECT id, name, interval, price_pence
           FROM plans
          WHERE id = $1 AND active = true AND retired_at IS NULL
          LIMIT 1`,
        [planId]
      );
      resolvedPlan = r.rows[0] || null;
    } catch (e) {
      warn('[billingOverview] plan_lookup_by_id_failed', { message: (e as any)?.message ?? String(e) });
    }
  }

  if (!resolvedPlan && sub?.price_pence && sub.price_pence > 0) {
    const cadence = (sub?.plan_interval || sub?.cadence || 'monthly').toString().toLowerCase();
    const interval = cadence.includes('year') || cadence.includes('annual') ? 'year' : 'month';
    try {
      const r = await pool.query(
        `SELECT id, name, interval, price_pence
           FROM plans
          WHERE interval = $1 AND price_pence = $2 AND active = true AND retired_at IS NULL
          ORDER BY sort ASC
          LIMIT 1`,
        [interval, sub.price_pence]
      );
      resolvedPlan = r.rows[0] || null;
    } catch (e) {
      warn('[billingOverview] plan_lookup_by_price_failed', { message: (e as any)?.message ?? String(e) });
    }
  }

  if (!resolvedPlan) {
    const cadence = (sub?.plan_interval || sub?.cadence || 'monthly').toString().toLowerCase();
    const interval = cadence.includes('year') || cadence.includes('annual') ? 'year' : 'month';
    try {
      const r = await pool.query(
        `SELECT id, name, interval, price_pence
           FROM plans
          WHERE interval = $1 AND active = true AND retired_at IS NULL
          ORDER BY sort ASC, price_pence ASC
          LIMIT 1`,
        [interval]
      );
      resolvedPlan = r.rows[0] || null;
    } catch (e) {
      warn('[billingOverview] plan_lookup_by_interval_failed', { message: (e as any)?.message ?? String(e) });
    }
  }

  if (!resolvedPlan && latestInvoice?.amount_pence) {
    try {
      const chargeResult = await pool.query(
        `SELECT amount_pence, type
           FROM invoice_charges
          WHERE invoice_id = $1 AND type = 'subscription_fee'
          ORDER BY id ASC
          LIMIT 1`,
        [latestInvoice.id]
      );
      if (chargeResult.rows.length > 0) {
        const subscriptionCharge = chargeResult.rows[0].amount_pence;
        const r = await pool.query(
          `SELECT id, name, interval, price_pence
             FROM plans
            WHERE price_pence = $1 AND active = true AND retired_at IS NULL
            ORDER BY sort ASC
            LIMIT 1`,
          [subscriptionCharge]
        );
        if (r.rows.length > 0) {
          resolvedPlan = r.rows[0];
        }
      }
    } catch (e) {
      warn('[billingOverview] plan_lookup_from_invoice_failed', { message: (e as any)?.message ?? String(e) });
    }
  }

  const resolvedPlanName = resolvedPlan?.name || sub?.plan_name || 'Digital Mailbox Plan';
  const resolvedCadence =
    (resolvedPlan?.interval || sub?.plan_interval || sub?.cadence || 'monthly')
      .toString()
      .toLowerCase()
      .includes('year')
      ? 'annual'
      : 'monthly';
  const fallbackPricePence = resolvedCadence === 'annual' ? 8999 : 999;

  let accountStatus = 'active';
  let gracePeriodInfo: { days_left: number; retry_count: number; grace_until: number } | null = null;
  if (user?.account_suspended_at) {
    accountStatus = 'suspended';
  } else if (user?.payment_failed_at) {
    const nowMs = now();
    const graceUntil = user.payment_grace_until;
    if (graceUntil && nowMs < graceUntil) {
      accountStatus = 'grace_period';
      const daysLeft = Math.ceil((graceUntil - nowMs) / (24 * 60 * 60 * 1000));
      gracePeriodInfo = {
        days_left: daysLeft,
        retry_count: user.payment_retry_count || 0,
        grace_until: graceUntil,
      };
    } else {
      accountStatus = 'past_due';
    }
  }

  return {
    plan_status: user?.plan_status || null,
    subscription: sub ? {
      status: sub.status || null,
      cadence: sub.cadence || sub.plan_interval || 'monthly',
      next_charge_at: sub.next_charge_at || null,
      mandate_id: sub.mandate_id || null,
      customer_id: sub.customer_id || null,
    } : null,
    latest_invoice: latestInvoice ? {
      id: latestInvoice.id,
      invoice_number: latestInvoice.invoice_number,
      amount_pence: latestInvoice.amount_pence,
      status: latestInvoice.status,
      period_start: latestInvoice.period_start,
      period_end: latestInvoice.period_end,
      created_at: latestInvoice.created_at,
    } : null,
    plan_id: resolvedPlan?.id ?? planId ?? null,
    plan: resolvedPlanName,
    cadence: resolvedCadence,
    status: sub?.status || 'active',
    account_status: accountStatus,
    grace_period: gracePeriodInfo,
    next_charge_at: sub?.next_charge_at ?? null,
    next_billing_date: (() => {
      if (stripeNextBillingDate) return stripeNextBillingDate;
      const nca = sub?.next_charge_at;
      if (nca != null && nca !== '') {
        const ms = Number(nca);
        if (!Number.isNaN(ms) && ms > 0) {
          const d = new Date(ms > 1e12 ? ms : ms * 1000);
          if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
      }
      const periodEnd = latestInvoice?.period_end;
      if (periodEnd && typeof periodEnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) return periodEnd;
      return null;
    })(),
    mandate_status: sub?.mandate_id ? 'active' : 'missing',
    has_mandate: !!(user?.gocardless_mandate_id || user?.stripe_customer_id),
    has_redirect_flow: !!user?.gocardless_redirect_flow_id,
    redirect_flow_id: user?.gocardless_redirect_flow_id ?? null,
    current_price_pence: (resolvedPlan?.price_pence && resolvedPlan.price_pence > 0)
      ? resolvedPlan.price_pence
      : (sub?.price_pence && sub.price_pence > 0)
        ? sub.price_pence
        : fallbackPricePence,
    latest_invoice_amount_pence: latestInvoice?.amount_pence || 0,
    pending_forwarding_fees_pence: await getPendingForwardingFees(userId, resolvedDeps),
    billing_provider: getProvider(),
  };
}
