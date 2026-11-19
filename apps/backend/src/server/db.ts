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


/**
 * A dedicated connection for one HTTP request's transaction, released automatically when the
 * response finishes or the client disconnects.
 *
 * BEGIN / COMMIT / ROLLBACK must all travel on the SAME connection. Sending them through the pool
 * (`getPool().query('BEGIN')`) lets each statement use a different connection, so work can be left
 * uncommitted, committed without its siblings, or never rolled back.
 */
export async function connectForRequest(res: { once: (event: string, cb: () => void) => unknown }) {
    const client = await getPool().connect();
    let released = false;
    const release = () => { if (!released) { released = true; client.release(); } };
    res.once('finish', release);
    res.once('close', release);
    return client;
}
