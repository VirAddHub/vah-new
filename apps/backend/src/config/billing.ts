/**
 * Billing provider and Stripe configuration.
 * Single switch: BILLING_PROVIDER = "gocardless" | "stripe"
 */

export type BillingProvider = 'gocardless' | 'stripe';

export function getBillingProvider(): BillingProvider {
  const v = (process.env.BILLING_PROVIDER || 'gocardless').toLowerCase().trim();
  if (v === 'stripe') return 'stripe';
  return 'gocardless';
}

export function isStripeEnabled(): boolean {
  return getBillingProvider() === 'stripe' && Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeConfig(): {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  priceIdMonthly: string;
  priceIdAnnual: string;
  appUrl: string;
} {
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const publishableKey = (process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  const priceIdMonthly = (process.env.STRIPE_PRICE_ID_MONTHLY || '').trim();
  const priceIdAnnual = (process.env.STRIPE_PRICE_ID_ANNUAL || '').trim();
  const appUrl = (process.env.APP_URL || process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  return {
    secretKey,
    publishableKey,
    webhookSecret,
    priceIdMonthly,
    priceIdAnnual,
    appUrl,
  };
}
