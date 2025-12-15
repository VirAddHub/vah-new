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

  const insertSql = `
    INSERT INTO subscription (user_id, plan_name, cadence, status, mandate_id, customer_id, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id) DO UPDATE SET
      plan_name = EXCLUDED.plan_name,
      cadence = EXCLUDED.cadence,
      status = EXCLUDED.status,
      mandate_id = COALESCE(subscription.mandate_id, EXCLUDED.mandate_id),
      customer_id = COALESCE(subscription.customer_id, EXCLUDED.customer_id),
      updated_at = EXCLUDED.updated_at
  `;

  try {
    await pool.query(insertSql, [userId, plan.name, cadence, status, mandateId, customerId, updatedAt]);
    return;
  } catch (e: any) {
    // If the unique constraint isn't there yet, Postgres errors with:
    // "there is no unique or exclusion constraint matching the ON CONFLICT specification"
    const msg = String(e?.message || "");
    if (!msg.toLowerCase().includes("on conflict") && e?.code !== "42P10") {
      throw e;
    }
  }

  // Fallback: update then insert (best-effort idempotent)
  const upd = await pool.query(
    `
    UPDATE subscription
    SET
      plan_name = $1,
      cadence = $2,
      status = $3,
      mandate_id = COALESCE(mandate_id, $4),
      customer_id = COALESCE(customer_id, $5),
      updated_at = $6
    WHERE user_id = $7
    `,
    [plan.name, cadence, status, mandateId, customerId, updatedAt, userId]
  );

  if (upd.rowCount) return;

  try {
    await pool.query(
      `
      INSERT INTO subscription (user_id, plan_name, cadence, status, mandate_id, customer_id, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, plan.name, cadence, status, mandateId, customerId, updatedAt]
    );
  } catch (e: any) {
    // tolerate a race where another request inserted it
    if (e?.code === "23505") return;
    throw e;
  }
}

