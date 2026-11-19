/**
 * Prices come from Stripe, never from the plans table.
 *
 * - Advertised price (pricing page, signup, admin plans list): the Stripe Price that Checkout uses
 *   for new subscriptions, i.e. STRIPE_MONTHLY_PRICE_ID / STRIPE_ANNUAL_PRICE_ID. Pointing one of
 *   those at a new Stripe Price changes what new customers see and pay; nothing else changes.
 * - A customer's own rate (billing dashboard, admin record): the Price on their own Stripe
 *   subscription. Stripe renews each subscription at its own Price, so two customers on the same
 *   Monthly plan can pay different amounts, and a new offer never changes an existing customer.
 *
 * plans.price_pence is only a fallback for display when Stripe cannot be reached.
 */
import type Stripe from 'stripe';
import { getStripe } from '../lib/stripe';
import { getStripeConfig } from '../config/billing';
import { logger } from '../lib/logger';

export interface StripeRate {
  priceId: string;
  amountPence: number;
  currency: string;
  interval: 'month' | 'year' | null;
}

export interface SubscriptionRate extends StripeRate {
  subscriptionId: string;
  status: string;
  currentPeriodEnd: number | null; // seconds
  cancelAtPeriodEnd: boolean;
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: unknown }>();
let stripeOverride: (() => Stripe | null) | null = null;

/** Tests only: replace the Stripe client. */
export function _setStripeForTests(fn: (() => Stripe | null) | null) { stripeOverride = fn; cache.clear(); }
export function clearStripePriceCache() { cache.clear(); }

const client = () => (stripeOverride ? stripeOverride() : getStripe());

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

function rateOf(price: Stripe.Price | null | undefined): StripeRate | null {
  if (!price || price.unit_amount == null) return null;
  const interval = price.recurring?.interval;
  return {
    priceId: price.id,
    amountPence: price.unit_amount,
    currency: (price.currency || 'gbp').toUpperCase(),
    interval: interval === 'month' || interval === 'year' ? interval : null,
  };
}

/** The prices Checkout uses for new monthly and annual subscriptions (each looked up independently). */
export async function getAdvertisedRates(): Promise<{ month: StripeRate | null; year: StripeRate | null }> {
  const stripe = client();
  if (!stripe) return { month: null, year: null };
  const { priceIdMonthly, priceIdAnnual } = getStripeConfig();
  const one = (id: string) => !id ? Promise.resolve(null) : cached(`price:${id}`, async () => {
    try { return rateOf(await stripe.prices.retrieve(id)); }
    catch (e) { logger.warn('[stripePrices] price_lookup_failed', { message: (e as Error)?.message }); return null; }
  });
  const [month, year] = await Promise.all([one(priceIdMonthly), one(priceIdAnnual)]);
  return { month, year };
}

/** The recurring rate on one customer's own Stripe subscription. */
export async function getSubscriptionRate(stripeSubscriptionId: string | null | undefined): Promise<SubscriptionRate | null> {
  const stripe = client();
  if (!stripe || !stripeSubscriptionId) return null;
  return cached(`sub:${stripeSubscriptionId}`, async () => {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
      const rate = rateOf(item?.price);
      if (!rate) return null;
      const quantity = item?.quantity ?? 1;
      const periodEnd = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
      return {
        ...rate,
        amountPence: rate.amountPence * quantity,
        subscriptionId: sub.id,
        status: sub.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
      };
    } catch (e) {
      logger.warn('[stripePrices] subscription_lookup_failed', { message: (e as Error)?.message });
      return null;
    }
  });
}

/** Called after a Stripe event changes a subscription, so the next read is fresh. */
export function forgetSubscriptionRate(stripeSubscriptionId: string | null | undefined) {
  if (stripeSubscriptionId) cache.delete(`sub:${stripeSubscriptionId}`);
}

/**
 * Replace the display price of each plan with the advertised Stripe price for its interval.
 * Plans whose interval has no Stripe price keep the stored price (fallback only).
 */
export function withAdvertisedPrice<T extends { interval?: string | null; price_pence?: number | string | null }>(
  plan: T, rates: { month: StripeRate | null; year: StripeRate | null },
): T & { price_pence: number; price_source: 'stripe' | 'fallback'; stripe_price_id: string | null } {
  const rate = plan.interval === 'year' ? rates.year : plan.interval === 'month' ? rates.month : null;
  return rate
    ? { ...plan, price_pence: rate.amountPence, price_source: 'stripe', stripe_price_id: rate.priceId }
    : { ...plan, price_pence: Number(plan.price_pence ?? 0), price_source: 'fallback', stripe_price_id: null };
}
