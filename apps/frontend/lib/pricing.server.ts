/** Real database pricing, loaded before rendering; no invented fallback amounts. */
import { API_BASE } from './config';
import type { InitialPricing } from '../contexts/PricingContext';
export type ServerPricing = InitialPricing;

export async function getServerPricing(): Promise<ServerPricing | null> {
  try {
    const res = await fetch(`${API_BASE}/api/plans`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const plans = Array.isArray(data) ? data : data?.ok ? (Array.isArray(data.data) ? data.data : data.data?.items) : null;
    if (!Array.isArray(plans)) return null;
    const priceFor = (interval: 'month' | 'year'): number | null => {
      const plan = plans.find(p => p.active !== false && p.interval === interval && (p.currency || 'GBP') === 'GBP');
      if (!plan || plan.price_pence == null || plan.price_pence === '') return null;
      const pence = Number(plan.price_pence);
      return Number.isSafeInteger(pence) && pence >= 0 ? pence / 100 : null;
    };
    const monthlyPrice = priceFor('month');
    const annualPrice = priceFor('year');
    return monthlyPrice === null && annualPrice === null ? null : {monthlyPrice, annualPrice};
  } catch {
    return null;
  }
}
