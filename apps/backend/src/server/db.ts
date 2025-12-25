// apps/backend/src/server/db.ts
// IMPORTANT: Keep a single Pool instance for the whole process.
// Many parts of the codebase import getPool from `src/lib/db`. Re-export it here to avoid double pools.
import type { Pool } from "pg";
import { closePool as closeSharedPool, getPool as getSharedPool } from "../lib/db";

export function getPool(): Pool {
    return getSharedPool();
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
    await closeSharedPool();
}
