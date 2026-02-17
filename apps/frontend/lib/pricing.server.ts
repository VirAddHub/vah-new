/**
 * Server-side pricing fetch for stable first paint.
 * Used by root layout/page to pass initialPricing to client and avoid price flicker.
 */

import { API_BASE } from './config';

export interface ServerPricing {
  monthlyPrice: number;
  annualPrice: number;
}

const FALLBACK: ServerPricing = {
  monthlyPrice: 9.99,
  annualPrice: 89.99,
};

/**
 * Fetch plan prices from the backend on the server.
 * Returns fallback values if the API fails so the client never sees £0/blank.
 * Use next: { revalidate: 60 } for 60s cache to reduce server load while keeping stable UX.
 */
export async function getServerPricing(): Promise<ServerPricing> {
  try {
    const url = `${API_BASE}/api/plans`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });

    if (!res.ok) return FALLBACK;

    const data = await res.json();
    let plans: Array<{ price?: number; price_pence?: number; interval?: string; isMonthly?: boolean; isAnnual?: boolean }> = [];

    if (Array.isArray(data)) {
      plans = data;
    } else if (data?.ok && data?.data) {
      plans = Array.isArray(data.data) ? data.data : data.data?.items ?? [];
    }

    const monthly = plans.find((p: any) => p.isMonthly || p.interval === 'month');
    const annual = plans.find((p: any) => p.isAnnual || p.interval === 'year');

    const monthlyPrice = monthly
      ? (monthly.price ?? (monthly.price_pence != null ? monthly.price_pence / 100 : FALLBACK.monthlyPrice))
      : FALLBACK.monthlyPrice;
    const annualPrice = annual
      ? (annual.price ?? (annual.price_pence != null ? annual.price_pence / 100 : FALLBACK.annualPrice))
      : FALLBACK.annualPrice;

    return {
      monthlyPrice: Number(monthlyPrice),
      annualPrice: Number(annualPrice),
    };
  } catch {
    return FALLBACK;
  }
}
