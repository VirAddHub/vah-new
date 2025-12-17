import { getPool } from '../../lib/db';

/**
 * Upsert a gc_billing_request_flow row to map BRQ/BRF IDs to VAH users.
 * This mapping is critical for webhook handlers to resolve customer_id → user_id.
 */
export async function upsertGcBillingRequestFlow(opts: {
  userId: number;
  planId: number;
  billingRequestId: string;
  billingRequestFlowId: string;
  customerId?: string | null;
}): Promise<void> {
  const pool = getPool();
  const now = Date.now();
  const customerId = opts.customerId ?? null;

  try {
    await pool.query(
      `
      INSERT INTO gc_billing_request_flow (
        created_at_ms, user_id, plan_id, billing_request_id, billing_request_flow_id, customer_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'created')
      ON CONFLICT (billing_request_flow_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        plan_id = EXCLUDED.plan_id,
        billing_request_id = EXCLUDED.billing_request_id,
        customer_id = COALESCE(EXCLUDED.customer_id, gc_billing_request_flow.customer_id),
        status = CASE
          WHEN gc_billing_request_flow.status = 'completed' THEN gc_billing_request_flow.status
          ELSE EXCLUDED.status
        END
      `,
      [now, opts.userId, opts.planId, opts.billingRequestId, opts.billingRequestFlowId, customerId]
    );
  } catch (e: any) {
    // If table doesn't exist yet (migration not run), log but don't throw
    const msg = String(e?.message || '');
    if (msg.toLowerCase().includes('does not exist') || e?.code === '42P01') {
      console.warn('[gcBillingRequestFlow] Table gc_billing_request_flow does not exist yet (migration 120 not run)');
      return;
    }
    // For other errors (constraint violations, etc.), log and rethrow
    console.error('[gcBillingRequestFlow] Insert failed:', {
      error: msg,
      code: e?.code,
      userId: opts.userId,
      billingRequestId: opts.billingRequestId,
      billingRequestFlowId: opts.billingRequestFlowId,
    });
    throw e;
  }
}
