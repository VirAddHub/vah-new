// PostgreSQL-only database helper - NO SQLite support
import { Pool, PoolClient, QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. This app does NOT support SQLite.");
}

if (!process.env.DATABASE_URL.startsWith('postgres')) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string. SQLite is not supported.");
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
    return pool.query<T>(text, params);
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();
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
