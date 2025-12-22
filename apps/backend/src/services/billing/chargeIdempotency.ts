// apps/backend/src/services/billing/chargeIdempotency.ts
/**
 * Idempotency helpers for charge creation
 * 
 * Generates deterministic related_id values for charges that need to be unique
 * per (user_id, period_start, period_end) combination.
 */

import { createHash } from 'crypto';

/**
 * Generate a deterministic BigInt related_id for invoice period charges
 * 
 * Uses SHA-256 hash of (userId|periodStart|periodEnd) and takes first 14 hex chars
 * to ensure it fits within PostgreSQL BIGINT range (< 2^63)
 * 
 * @param userId User ID
 * @param periodStart Period start date (YYYY-MM-DD format)
 * @param periodEnd Period end date (YYYY-MM-DD format)
 * @returns BigInt value suitable for charge.related_id
 */
export function invoicePeriodRelatedId(
  userId: number,
  periodStart: string,
  periodEnd: string
): bigint {
  const input = `${userId}|${periodStart}|${periodEnd}`;
  const hash = createHash('sha256').update(input).digest('hex');
  
  // Take first 14 hex chars (56 bits) to ensure it fits in BIGINT (< 2^63)
  // This gives us 2^56 possible values, which is more than enough
  const hexStr = hash.substring(0, 14);
  
  // Convert hex string to BigInt
  return BigInt('0x' + hexStr);
}

