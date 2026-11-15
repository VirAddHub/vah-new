/**
 * Billing provider and Stripe configuration.
 * Stripe is the only billing provider. The former BILLING_PROVIDER switch has been removed;
 * the variable is ignored if it is still set.
 */

export type BillingProvider = 'stripe';

export function getBillingProvider(): BillingProvider {
  return 'stripe';
}

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
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
