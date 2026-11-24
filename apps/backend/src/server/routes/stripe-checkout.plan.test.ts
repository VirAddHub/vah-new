import { describe, it, expect, vi } from 'vitest';
import { resolveCheckoutPlanId } from './stripe-checkout';

const poolWith = (rows: any[]) => ({ query: vi.fn().mockResolvedValue({ rows }) });

describe('resolveCheckoutPlanId', () => {
  it('uses the plan the page sent', async () => {
    const pool = poolWith([]);
    expect(await resolveCheckoutPlanId(pool, 7, 3, 'monthly')).toBe(7);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("falls back to the customer's saved plan", async () => {
    const pool = poolWith([]);
    expect(await resolveCheckoutPlanId(pool, null, 3, 'annual')).toBe(3);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('otherwise picks the active plan for the chosen billing period', async () => {
    const pool = poolWith([{ id: 2 }]);
    expect(await resolveCheckoutPlanId(pool, null, null, 'annual')).toBe(2);
    expect(pool.query.mock.calls[0][1]).toEqual(['year']);

    const monthly = poolWith([{ id: 1 }]);
    expect(await resolveCheckoutPlanId(monthly, null, null, 'monthly')).toBe(1);
    expect(monthly.query.mock.calls[0][1]).toEqual(['month']);
  });

  it('returns null when no active plan matches', async () => {
    expect(await resolveCheckoutPlanId(poolWith([]), null, null, 'monthly')).toBeNull();
  });
});
