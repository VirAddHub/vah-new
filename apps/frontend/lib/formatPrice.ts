/**
 * Centralized price formatting for consistent display across the app.
 * Use this everywhere instead of ad-hoc string building to avoid flicker and CLS.
 */

export interface FormatPriceOptions {
  /** Show interval suffix e.g. "/ month" */
  interval?: 'month' | 'year';
  /** Currency symbol (default £) */
  currency?: string;
}

const defaultCurrency = '£';

/**
 * Format a numeric price for display.
 * Uses fixed 2 decimal places and is safe for layout (no width jump).
 */
export function formatPrice(
  amount: number,
  options: FormatPriceOptions = {}
): string {
  const { interval, currency = defaultCurrency } = options;
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = `${currency}${value.toFixed(2)}`;
  if (interval === 'month') return `${formatted}/ month`;
  if (interval === 'year') return `${formatted}/ year`;
  return formatted;
}

/**
 * Format monthly price with "/ month" suffix.
 */
export function formatMonthly(amount: number): string {
  return formatPrice(amount, { interval: 'month' });
}

/**
 * Format annual price with "/ year" suffix.
 */
export function formatAnnual(amount: number): string {
  return formatPrice(amount, { interval: 'year' });
}
