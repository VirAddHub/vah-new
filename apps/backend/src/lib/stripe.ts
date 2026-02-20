/**
 * Stripe client and helpers for billing (test mode in parallel with GoCardless).
 * Do not log secrets or full payloads containing PII.
 */

import Stripe from 'stripe';
import { getStripeConfig, isStripeEnabled } from '../config/billing';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isStripeEnabled()) return null;
  if (!stripeInstance) {
    const { secretKey } = getStripeConfig();
    if (!secretKey) return null;
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

export function getStripeWebhookSecret(): string {
  return getStripeConfig().webhookSecret;
}

/**
 * Verify webhook signature. Returns the parsed event or null if invalid.
 * Uses raw body and Stripe-Signature header.
 */
export function verifyStripeWebhook(
  rawBody: string | Buffer,
  signatureHeader: string | null
): Stripe.Event | null {
  const secret = getStripeWebhookSecret();
  if (!secret || !signatureHeader) return null;
  try {
    const stripe = getStripe();
    if (!stripe) return null;
    const event = stripe.webhooks.constructEvent(
      typeof rawBody === 'string' ? rawBody : (rawBody as Buffer).toString('utf8'),
      signatureHeader,
      secret
    );
    return event;
  } catch {
    return null;
  }
}

/**
 * Get Stripe Price ID for billing period
 */
export function getStripePriceId(billingPeriod: 'monthly' | 'annual'): string | null {
  const { priceIdMonthly, priceIdAnnual } = getStripeConfig();
  if (billingPeriod === 'annual') return priceIdAnnual || null;
  return priceIdMonthly || null;
}

/**
 * Redact Stripe IDs for safe logging (no full IDs in logs)
 */
export function redactStripeId(id: string | null | undefined): string {
  if (!id || typeof id !== 'string') return 'n/a';
  if (id.length <= 6) return `${id.slice(0, 2)}…`;
  return `${id.slice(0, 3)}…${id.slice(-4)}`;
}

/**
 * Create a Stripe Customer Portal session for updating payment method.
 * Returns the portal URL.
 */
export async function createStripePortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  if (!session.url) throw new Error('No portal URL returned');
  return { url: session.url };
}
