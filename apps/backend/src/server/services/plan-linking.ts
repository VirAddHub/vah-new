import { TimestampUtils } from "../../lib/timestamp-utils";

type PlanRow = { id: number; name: string; slug: string; interval: string };

function isSandboxEnv(): boolean {
  const env = String(process.env.GC_ENVIRONMENT ?? process.env.GOCARDLESS_ENV ?? "live")
    .trim()
    .toLowerCase();
  return env === "sandbox";
}

async function resolveDefaultPlan(
  pool: any,
  cadence: "monthly" | "annual" = "monthly"
): Promise<PlanRow> {
  const preferredSlug =
    cadence === "annual" ? "virtual-mailbox-annual" : "virtual-mailbox-monthly";

  // Prefer a stable slug when present
  {
    const r = await pool.query(
      `SELECT id, name, slug, interval
       FROM plans
       WHERE slug = $1
       LIMIT 1`,
      [preferredSlug]
    );
    if (r.rows?.length) return r.rows[0];
  }

  // Fallback: pick the first active plan by interval
  {
    const interval = cadence === "annual" ? "year" : "month";
    const r = await pool.query(
      `SELECT id, name, slug, interval
       FROM plans
       WHERE active = true
         AND retired_at IS NULL
         AND interval = $1
       ORDER BY sort ASC, price_pence ASC
       LIMIT 1`,
      [interval]
    );
    if (r.rows?.length) return r.rows[0];
  }

  // Last resort: any active plan
  const any = await pool.query(
    `SELECT id, name, slug, interval
     FROM plans
     WHERE active = true
       AND retired_at IS NULL
     ORDER BY sort ASC, price_pence ASC
     LIMIT 1`
  );
  if (any.rows?.length) return any.rows[0];

  throw new Error("No active plans found");
}

/**
 * Ensure a user with an active plan has a plan_id set (no UI inference).
 * Prefers existing user.plan_id. Only defaults in sandbox.
 * - Sets plan_id (only if currently NULL)
 * - Ensures plan_status='active'
 * - Ensures plan_start_date is set (if NULL)
 */
export async function ensureUserPlanLinked(opts: {
  pool: any;
  userId: number;
  planId?: number | null;
  cadence?: "monthly" | "annual";
}): Promise<{ planId: number; planName: string }> {
  const { pool, userId } = opts;
  const cadence = opts.cadence ?? "monthly";

  // If user already has a plan_id, keep it (do not override)
  {
    const r = await pool.query(`SELECT plan_id FROM "user" WHERE id = $1 LIMIT 1`, [userId]);
    const existing = r.rows?.[0]?.plan_id;
    if (existing) {
      const p = await pool.query(`SELECT id, name, slug, interval FROM plans WHERE id = $1 LIMIT 1`, [existing]);
      const row = p.rows?.[0];
      if (row?.id) {
        return { planId: row.id, planName: row.name };
      }
      // If plan row missing, continue to relink below.
    }
  }

  // If caller provided a planId, use it (must exist)
  if (opts.planId && Number(opts.planId) > 0) {
    const r = await pool.query(
      `SELECT id, name, slug, interval FROM plans WHERE id = $1 LIMIT 1`,
      [Number(opts.planId)]
    );
    if (r.rows?.length) {
      const plan = r.rows[0] as PlanRow;
      const now = Date.now();
      const updatedAt = TimestampUtils.forTableField("user", "updated_at") ?? now;
      // NOTE: plan_status is only updated via GoCardless webhooks when subscription.status transitions to 'active'
      await pool.query(
        `
        UPDATE "user"
        SET
          plan_id = COALESCE(plan_id, $1),
          plan_start_date = COALESCE(plan_start_date, $2),
          updated_at = $3
        WHERE id = $4
        `,
        [plan.id, now, updatedAt, userId]
      );
      return { planId: plan.id, planName: plan.name };
    }
  }

  // No explicit plan id. Default ONLY in sandbox.
  if (!isSandboxEnv()) {
    throw new Error("plan_required_live_environment");
  }

  const plan = await resolveDefaultPlan(pool, cadence);
  const now = Date.now();
  const updatedAt = TimestampUtils.forTableField("user", "updated_at") ?? now;

  // NOTE: plan_status is only updated via GoCardless webhooks when subscription.status transitions to 'active'
  await pool.query(
    `
    UPDATE "user"
    SET
      plan_id = COALESCE(plan_id, $1),
      plan_start_date = COALESCE(plan_start_date, $2),
      updated_at = $3
    WHERE id = $4
    `,
    [plan.id, now, updatedAt, userId]
  );

  return { planId: plan.id, planName: plan.name };
}

