import { TimestampUtils } from "../../lib/timestamp-utils";

type PlanRow = { name: string; interval: string };

function cadenceFromInterval(interval: string): "monthly" | "annual" | string {
  const v = String(interval || "").toLowerCase();
  if (v === "month" || v === "monthly") return "monthly";
  if (v === "year" || v === "annual") return "annual";
  return interval;
}

/**
 * Ensure a subscription row exists for the user and reflects their chosen plan.
 *
 * Idempotent:
 * - Prefer INSERT ... ON CONFLICT(user_id) DO UPDATE when a unique constraint exists.
 * - Falls back to update-then-insert when constraint isn't present yet.
 */
export async function upsertSubscriptionForUser(opts: {
  pool: any;
  userId: number;
  status?: "active" | "past_due" | "cancelled" | string;
  mandateId?: string | null;
  customerId?: string | null;
}): Promise<void> {
  const { pool, userId } = opts;
  const status = opts.status ?? "active";
  const now = Date.now();
  const updatedAt = TimestampUtils.forTableField("subscription", "updated_at") ?? now;

  // Resolve plan from user.plan_id
  const planRes = await pool.query(
    `
    SELECT p.name, p.interval
    FROM "user" u
    JOIN plans p ON p.id = u.plan_id
    WHERE u.id = $1
    LIMIT 1
    `,
    [userId]
  );

  const plan: PlanRow | undefined = planRes.rows?.[0];
  if (!plan?.name) {
    // No plan assigned yet; don't create a meaningless subscription row.
    return;
  }

  const cadence = cadenceFromInterval(plan.interval);
  const mandateId = opts.mandateId ?? null;
  const customerId = opts.customerId ?? null;

  // UPSERT pattern: exactly one subscription per user (enforced by unique constraint)
  // Never downgrade an already-active subscription when we upsert "pending" during checkout retries.
  // Allow cancelled -> pending for restart flows (when explicitly setting status to 'pending').
  // Precedence: active > cancelled (unless restarting with pending) > anything else.
  const insertSql = `
    INSERT INTO subscription (user_id, plan_name, cadence, status, mandate_id, customer_id, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      plan_name = EXCLUDED.plan_name,
      cadence = EXCLUDED.cadence,
      status = CASE
        WHEN subscription.status = 'active' THEN subscription.status
        WHEN subscription.status = 'cancelled' AND EXCLUDED.status = 'pending' THEN 'pending'
        WHEN subscription.status = 'cancelled' THEN subscription.status
        ELSE EXCLUDED.status
      END,
      mandate_id = COALESCE(EXCLUDED.mandate_id, subscription.mandate_id),
      customer_id = COALESCE(EXCLUDED.customer_id, subscription.customer_id),
      updated_at = NOW()
  `;

  await pool.query(insertSql, [userId, plan.name, cadence, status, mandateId, customerId]);
}

