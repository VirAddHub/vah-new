import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import '@testing-library/jest-dom/vitest';
import { PricingProvider } from '../contexts/PricingContext';
import { PlansPage } from '../components/PlansPage';
import { getServerPricing } from '../lib/pricing.server';
vi.mock('../lib/apiClient', () => ({ apiClient: { get: vi.fn() } }));
import { apiClient } from '../lib/apiClient';
// jsdom does not implement Node's AbortSignal.timeout used by the server loader.
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('AbortSignal', { timeout: () => new AbortController().signal });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const priced = () => (
  <PricingProvider initialPricing={{ monthlyPrice: 12.34, annualPrice: 120 }}>
    <PlansPage onNavigate={vi.fn()} />
  </PricingProvider>
);
it('includes real prices in server HTML and does not refetch after mounting', () => {
  expect(renderToString(priced())).toContain('£12.34');
  expect(renderToString(priced())).toContain('£120.00');
  render(priced());
  expect(screen.getByText('£12.34')).toBeInTheDocument();
  expect(screen.getByText('£120.00')).toBeInTheDocument();
  expect(screen.getByText(/Save £28.08 a year/)).toBeInTheDocument();
  expect(apiClient.get).not.toHaveBeenCalled();
  expect(screen.queryByText(/2 months free/)).not.toBeInTheDocument();
});
it('does not substitute a price or enable signup when the server cannot retrieve pricing', () => {
  render(
    <PricingProvider initialPricing={null}>
      <PlansPage onNavigate={vi.fn()} />
    </PricingProvider>,
  );
  expect(screen.getAllByText('Pricing unavailable')).toHaveLength(2);
  expect(screen.getByRole('button', { name: /Choose annual/ })).toBeDisabled();
  expect(screen.queryByText(/£9\.99|£9\.95|£89\.99|£0\.00/)).not.toBeInTheDocument();
  expect(apiClient.get).not.toHaveBeenCalled();
});
it('does not invent a missing annual plan', () => {
  render(
    <PricingProvider initialPricing={{ monthlyPrice: 12.34, annualPrice: null }}>
      <PlansPage onNavigate={vi.fn()} />
    </PricingProvider>,
  );
  expect(screen.getByRole('button', { name: /Choose annual/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Choose monthly/ })).toBeEnabled();
});
it('uses integer database pence instead of conflicting formatted or derived prices', async () => {
  const fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: [
        { interval: 'month', price_pence: 1234, price: 9.95 },
        { interval: 'year', price_pence: 12000, price: 89.99 },
      ],
    }),
  }));
  vi.stubGlobal('fetch', fetch);
  expect(await getServerPricing()).toEqual({ monthlyPrice: 12.34, annualPrice: 120 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([
  null,
  {},
  { ok: true, data: [{ interval: 'month', price_pence: 'bad' }] },
  { ok: false, data: [] },
])('returns unavailable for malformed or missing prices: %j', async (data) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => data })),
  );
  expect(await getServerPricing()).toBeNull();
});
it('returns unavailable on a backend outage', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, status: 503 })),
  );
  expect(await getServerPricing()).toBeNull();
});

it('preserves the billing choice for both signup actions', () => {
  const onNavigate = vi.fn();
  render(
    <PricingProvider initialPricing={{ monthlyPrice: 12.34, annualPrice: 120 }}>
      <PlansPage onNavigate={onNavigate} />
    </PricingProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Choose monthly/ }));
  expect(onNavigate).toHaveBeenLastCalledWith('signup', { initialBilling: 'monthly' });
  fireEvent.click(screen.getByRole('button', { name: /Choose annual/ }));
  expect(onNavigate).toHaveBeenLastCalledWith('signup', { initialBilling: 'annual' });
});
