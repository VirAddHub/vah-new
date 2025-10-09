// PostgreSQL-only database helper - NO SQLite support
import { Pool, PoolClient, QueryResultRow } from "pg";

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
            // Add proper connection settings to prevent SASL errors
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 20, // Maximum number of clients in the pool
            min: 2,  // Minimum number of clients in the pool
            // Ensure password is handled correctly
            allowExitOnIdle: true,
        });
        
        // Don't connect immediately - let first query open the connection
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
