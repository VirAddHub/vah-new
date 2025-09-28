// apps/backend/src/server/db.ts
import { Pool, PoolConfig } from "pg";

let pool: Pool | null = null;

function sslConfigFromEnv(): PoolConfig["ssl"] {
    const url = process.env.DATABASE_URL || "";
    const disable =
        /sslmode=disable/i.test(url) || process.env.PGSSLMODE === "disable";
    // Render Postgres usually needs TLS; local often doesn't.
    return disable ? false : { rejectUnauthorized: false };
}

export function getPool(): Pool {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: sslConfigFromEnv(),
            // (optional) tweak timeouts here if needed
        });
    }
    return pool;
}

export async function ensureSchema(): Promise<void> {
    const p = getPool();
    // keep it lightweight; just ensure a meta table exists
    await p.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
