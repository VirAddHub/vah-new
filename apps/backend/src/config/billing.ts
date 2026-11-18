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

function firstSet(...names: string[]): string {
  for (const n of names) {
    const v = (process.env[n] || '').trim();
    if (v) return v;
  }
  return '';
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
  // STRIPE_MONTHLY_PRICE_ID / STRIPE_ANNUAL_PRICE_ID are the names set on Render. The earlier names
  // (STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_ANNUAL) are still read if the new ones are absent.
  const priceIdMonthly = firstSet('STRIPE_MONTHLY_PRICE_ID', 'STRIPE_PRICE_ID_MONTHLY');
  const priceIdAnnual = firstSet('STRIPE_ANNUAL_PRICE_ID', 'STRIPE_PRICE_ID_ANNUAL');
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
