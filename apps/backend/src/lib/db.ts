// PostgreSQL-only database helper - NO SQLite support
import { Pool, PoolClient, QueryResultRow } from "pg";
import { logger } from "./logger";

// Lazy DB initialization - don't connect at import time
let pool: Pool | undefined;

export function getPool() {
    if (!pool) {
        const url = process.env.DATABASE_URL;

        if (!url) {
            throw new Error("DATABASE_URL is required. This app does NOT support SQLite.");
        }

        if (!url.startsWith('postgres')) {
            throw new Error("DATABASE_URL must be a PostgreSQL connection string. SQLite is not supported.");
        }

        pool = new Pool({
            connectionString: url,
            ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
            // Production safety defaults (tunable via env)
            max: Number(process.env.PGPOOL_MAX || 20),
            idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS || 30_000),
            connectionTimeoutMillis: Number(process.env.PGPOOL_CONN_TIMEOUT_MS || 2_000),
            // Fail-fast on long-running queries from the client side (server-side statement_timeout can be added later)
            query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS || 10_000),
            // Allow process to exit if this is the only thing keeping it alive (useful for scripts)
            allowExitOnIdle: true,
        });

        pool.on("error", (err) => {
            logger.error("[db] unexpected pool error", { message: err?.message });
        });
    }
    return pool;
}

// Backward compatibility - but now lazy
export const DATABASE_URL = process.env.DATABASE_URL;

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
    return getPool().query<T>(text, params);
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await getPool().connect();
    try {
        await client.query("BEGIN");
        const out = await fn(client);
        await client.query("COMMIT");
        return out;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function closePool(): Promise<void> {
    if (pool) {
        try {
            await pool.end();
        } finally {
            pool = undefined;
        }
    }
}

// Helper functions for common patterns
export async function getOne<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T | null> {
    const { rows } = await query<T>(text, params);
    return rows[0] || null;
}

export async function getAll<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T[]> {
    const { rows } = await query<T>(text, params);
    return rows;
}

export async function insertAndReturnId(text: string, params?: any[]): Promise<number> {
    const { rows } = await query<{ id: number }>(text + " RETURNING id", params);
    return rows[0].id;
}
