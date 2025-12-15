#!/usr/bin/env node
/**
 * Backfill: set plan_id for users with plan_status='active' but plan_id IS NULL.
 *
 * Usage:
 *   DATABASE_URL=... node apps/backend/scripts/backfill-active-users-plan-id.js
 */

const { Client } = require("pg");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    // Resolve the default plan id (prefer the monthly plan slug)
    let planId = null;
    {
      const r = await client.query(
        `SELECT id FROM plans WHERE slug = $1 LIMIT 1`,
        ["virtual-mailbox-monthly"]
      );
      planId = r.rows[0]?.id ?? null;
    }

    if (!planId) {
      const r = await client.query(
        `SELECT id
         FROM plans
         WHERE active = true AND retired_at IS NULL AND interval = 'month'
         ORDER BY sort ASC, price_pence ASC
         LIMIT 1`
      );
      planId = r.rows[0]?.id ?? null;
    }

    if (!planId) {
      throw new Error("No active monthly plan found to backfill plan_id");
    }

    const now = Date.now();

    // Only touch users who are active but missing a plan_id
    const res = await client.query(
      `
      UPDATE "user"
      SET
        plan_id = $1,
        plan_start_date = COALESCE(plan_start_date, $2),
        updated_at = $2
      WHERE plan_status = 'active'
        AND plan_id IS NULL
        AND deleted_at IS NULL
      `,
      [planId, now]
    );

    console.log(`✅ Backfill complete. Updated users: ${res.rowCount}`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  });
}

