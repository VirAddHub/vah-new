import { describe, it, expect, afterEach } from 'vitest';
import { getStripeConfig } from '../../config/billing';

const NAMES = ['STRIPE_MONTHLY_PRICE_ID', 'STRIPE_ANNUAL_PRICE_ID', 'STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_ANNUAL'];
const saved = Object.fromEntries(NAMES.map(n => [n, process.env[n]]));
afterEach(() => { for (const n of NAMES) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; } });
const clear = () => NAMES.forEach(n => delete process.env[n]);

describe('Stripe price ID configuration', () => {
  it('reads STRIPE_MONTHLY_PRICE_ID and STRIPE_ANNUAL_PRICE_ID (the names set on Render)', () => {
    clear();
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_test_monthly';
    process.env.STRIPE_ANNUAL_PRICE_ID = ' price_test_annual ';
    expect(getStripeConfig()).toMatchObject({ priceIdMonthly: 'price_test_monthly', priceIdAnnual: 'price_test_annual' });
  });
  it('prefers the Render names over the earlier names', () => {
    clear();
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_new'; process.env.STRIPE_PRICE_ID_MONTHLY = 'price_old';
    expect(getStripeConfig().priceIdMonthly).toBe('price_new');
  });
  it('still reads the earlier names when the Render names are absent', () => {
    clear();
    process.env.STRIPE_PRICE_ID_MONTHLY = 'price_old_m'; process.env.STRIPE_PRICE_ID_ANNUAL = 'price_old_a';
    expect(getStripeConfig()).toMatchObject({ priceIdMonthly: 'price_old_m', priceIdAnnual: 'price_old_a' });
  });
  it('is empty when neither is set', () => {
    clear();
    expect(getStripeConfig()).toMatchObject({ priceIdMonthly: '', priceIdAnnual: '' });
  });
});
