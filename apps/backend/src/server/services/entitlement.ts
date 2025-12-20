/**
 * User Entitlement Service
 * 
 * Determines if a user is entitled to access services based on subscription status.
 * 
 * Rule: entitled = (subscription.status === 'active')
 * 
 * This is the single source of truth for access decisions.
 * user.plan_status is just a cache for UI - never trust it alone.
 */

import { getPool } from '../db';

export interface EntitlementResult {
  entitled: boolean;
  subscriptionStatus: string | null;
  subscriptionId: number | null;
  reason?: string; // Why not entitled (if applicable)
}

/**
 * Check if a user is entitled to access services
 * 
 * @param userId - User ID to check
 * @returns Entitlement result with subscription status
 */
export async function isUserEntitled(userId: number): Promise<EntitlementResult> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, status FROM subscription WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      entitled: false,
      subscriptionStatus: null,
      subscriptionId: null,
      reason: 'no_subscription',
    };
  }

  const subscription = result.rows[0];
  const entitled = subscription.status === 'active';

  return {
    entitled,
    subscriptionStatus: subscription.status,
    subscriptionId: subscription.id,
    reason: entitled ? undefined : `subscription_status_${subscription.status}`,
  };
}

/**
 * Check if a user is entitled (synchronous check using cached plan_status)
 * 
 * This is a fast check for UI purposes only. For critical decisions,
 * use isUserEntitled() which reads from subscription table.
 * 
 * @param planStatus - Cached plan_status from user table
 * @returns true if plan_status is 'active'
 */
export function isUserEntitledCached(planStatus: string | null | undefined): boolean {
  return planStatus === 'active';
}

