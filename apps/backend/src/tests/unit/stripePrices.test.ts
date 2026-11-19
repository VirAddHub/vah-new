import { describe, it, expect, beforeEach, vi } from 'vitest';
import { _setStripeForTests, getAdvertisedRates, getSubscriptionRate, forgetSubscriptionRate, withAdvertisedPrice } from '../../services/stripePrices';

const price = (id: string, amount: number, interval: 'month' | 'year') => ({ id, unit_amount: amount, currency: 'gbp', recurring: { interval } });

function fakeStripe() {
  const prices: Record<string, any> = {
    price_month_999: price('price_month_999', 999, 'month'),
    price_month_677: price('price_month_677', 677, 'month'),
    price_year_8999: price('price_year_8999', 8999, 'year'),
  };
  const subs: Record<string, any> = {
    sub_old: { id: 'sub_old', status: 'active', cancel_at_period_end: false, items: { data: [{ price: prices.price_month_999, quantity: 1, current_period_end: 1797706800 }] } },
    sub_new: { id: 'sub_new', status: 'active', cancel_at_period_end: false, items: { data: [{ price: prices.price_month_677, quantity: 1, current_period_end: 1797706900 }] } },
  };
  return {
    prices: { retrieve: vi.fn(async (id: string) => { if (!prices[id]) throw new Error('No such price'); return prices[id]; }) },
    subscriptions: { retrieve: vi.fn(async (id: string) => { if (!subs[id]) throw new Error('No such subscription'); return subs[id]; }) },
  };
}

describe('Stripe is the source of every price', () => {
  let stripe: ReturnType<typeof fakeStripe>;
  beforeEach(() => {
    stripe = fakeStripe();
    _setStripeForTests(() => stripe as any);
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_month_999';
    process.env.STRIPE_ANNUAL_PRICE_ID = 'price_year_8999';
  });

  it('advertises the prices Checkout uses, monthly and annual independently', async () => {
    const r = await getAdvertisedRates();
    expect(r.month).toMatchObject({ priceId: 'price_month_999', amountPence: 999, interval: 'month' });
    expect(r.year).toMatchObject({ priceId: 'price_year_8999', amountPence: 8999, interval: 'year' });
  });

  it('a replacement monthly price changes only the monthly advertised price', async () => {
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_month_677';
    _setStripeForTests(() => stripe as any); // clears the cache, as a redeploy would
    const r = await getAdvertisedRates();
    expect(r.month?.amountPence).toBe(677);
    expect(r.year?.amountPence).toBe(8999);
  });

  it('plans show the Stripe price for their interval; the stored price is only a fallback', async () => {
    const rates = await getAdvertisedRates();
    expect(withAdvertisedPrice({ interval: 'month', price_pence: '677' }, rates)).toMatchObject({ price_pence: 999, price_source: 'stripe' });
    expect(withAdvertisedPrice({ interval: 'month', price_pence: '677' }, { month: null, year: null })).toMatchObject({ price_pence: 677, price_source: 'fallback' });
  });

  it('each customer keeps their own rate: same Monthly plan, different amounts', async () => {
    const a = await getSubscriptionRate('sub_old');
    const b = await getSubscriptionRate('sub_new');
    expect(a).toMatchObject({ amountPence: 999, interval: 'month', priceId: 'price_month_999', currentPeriodEnd: 1797706800 });
    expect(b).toMatchObject({ amountPence: 677, interval: 'month', priceId: 'price_month_677' });
  });

  it('caches briefly and forgets after a Stripe event', async () => {
    await getSubscriptionRate('sub_old'); await getSubscriptionRate('sub_old');
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledTimes(1);
    forgetSubscriptionRate('sub_old');
    await getSubscriptionRate('sub_old');
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledTimes(2);
  });

  it('Stripe unreachable: no made-up rate', async () => {
    _setStripeForTests(() => null);
    expect(await getSubscriptionRate('sub_old')).toBeNull();
    expect(await getAdvertisedRates()).toEqual({ month: null, year: null });
  });
});
