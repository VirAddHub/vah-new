/**
 * Multi-business pricing: first business = base price, each extra £1 less, floor £5.99.
 * Prices in pence.
 */

const BASE_PRICE_PENCE = 999;
const DISCOUNT_PER_EXTRA_PENCE = 100;
const FLOOR_PRICE_PENCE = 599;

/**
 * Returns the monthly price in pence for the next business given how many
 * businesses the user already has.
 * - 0 existing → 999 (first business)
 * - 1 existing → 899, 2 → 799, 3 → 699, 4+ → 599 (floor)
 */
export function getMonthlyPricePenceForNextBusiness(existingCount: number): number {
  if (existingCount < 0) return BASE_PRICE_PENCE;
  if (existingCount === 0) return BASE_PRICE_PENCE;
  const price = BASE_PRICE_PENCE - existingCount * DISCOUNT_PER_EXTRA_PENCE;
  return Math.max(FLOOR_PRICE_PENCE, price);
}
