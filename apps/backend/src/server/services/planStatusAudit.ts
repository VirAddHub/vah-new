/**
 * Plan Status Audit Service
 * 
 * Creates audit records for every plan status change.
 * This ensures we can always answer: what changed, when, why, and which GoCardless event did it.
 */

import { getPool } from '../db';

export interface PlanStatusEventParams {
  userId: number;
  subscriptionId?: number | null;
  oldStatus: string | null;
  newStatus: string;
  reason: string; // e.g., 'webhook_mandate_active', 'webhook_payment_failed', etc.
  gocardlessEventId?: string | null;
  gocardlessEventType?: string | null; // e.g., 'mandates.active', 'payments.failed'
  gocardlessEventCreatedAt?: Date | string | null;
  metadata?: Record<string, any> | null; // Additional context
}

/**
 * Insert a plan status event audit record
 */
export async function insertPlanStatusEvent(params: PlanStatusEventParams): Promise<void> {
  const pool = getPool();

  await pool.query(
    `INSERT INTO plan_status_event (
      user_id,
      subscription_id,
      old_status,
      new_status,
      reason,
      gocardless_event_id,
      gocardless_event_type,
      gocardless_event_created_at,
      metadata,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      params.userId,
      params.subscriptionId ?? null,
      params.oldStatus,
      params.newStatus,
      params.reason,
      params.gocardlessEventId ?? null,
      params.gocardlessEventType ?? null,
      params.gocardlessEventCreatedAt ? new Date(params.gocardlessEventCreatedAt) : null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ]
  );
}

/**
 * Check if a webhook event is stale (out-of-order)
 * 
 * @param userId - User ID
 * @param eventCreatedAt - When the event was created (from GoCardless)
 * @param eventId - Event ID from GoCardless
 * @returns true if event is stale (should be ignored)
 */
export async function isStaleWebhookEvent(
  userId: number,
  eventCreatedAt: Date | string | null,
  eventId?: string | null
): Promise<{ isStale: boolean; lastEventCreatedAt: Date | null; lastEventId: string | null }> {
  const pool = getPool();

  if (!eventCreatedAt) {
    // If no timestamp, we can't check - assume not stale
    return { isStale: false, lastEventCreatedAt: null, lastEventId: null };
  }

  const result = await pool.query(
    `SELECT last_event_created_at, last_event_id 
     FROM subscription 
     WHERE user_id = $1 
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    // No subscription exists yet - not stale
    return { isStale: false, lastEventCreatedAt: null, lastEventId: null };
  }

  const subscription = result.rows[0];
  const lastEventCreatedAt = subscription.last_event_created_at;
  const lastEventId = subscription.last_event_id;

  if (!lastEventCreatedAt) {
    // No previous event - not stale
    return { isStale: false, lastEventCreatedAt: null, lastEventId: null };
  }

  const eventDate = new Date(eventCreatedAt);
  const lastEventDate = new Date(lastEventCreatedAt);

  // Event is stale if it was created before the last event we processed
  const isStale = eventDate <= lastEventDate;

  return {
    isStale,
    lastEventCreatedAt: lastEventDate,
    lastEventId,
  };
}

/**
 * Update subscription with latest event info (after processing)
 */
export async function updateSubscriptionEventInfo(
  userId: number,
  eventCreatedAt: Date | string,
  eventId?: string | null
): Promise<void> {
  const pool = getPool();

  await pool.query(
    `UPDATE subscription 
     SET last_event_created_at = $1, 
         last_event_id = $2,
         updated_at = NOW()
     WHERE user_id = $3`,
    [new Date(eventCreatedAt), eventId ?? null, userId]
  );
}

