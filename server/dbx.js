// Database adapter that works with both SQLite and PostgreSQL
// Automatically detects DB_VENDOR environment variable

const path = require("node:path");

let db;
let dbType;

if (process.env.DB_VENDOR === 'pg' || process.env.DATABASE_URL?.startsWith('postgres')) {
    // PostgreSQL
    const { Pool } = require('pg');
    dbType = 'pg';

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Create a SQLite-compatible interface
    db = {
        prepare: (sql) => {
            const stmt = {
                get: (params = {}) => pool.query(sql, Object.values(params)).then(res => res.rows[0]),
                all: (params = {}) => pool.query(sql, Object.values(params)).then(res => res.rows),
                run: (params = {}) => pool.query(sql, Object.values(params)).then(res => ({ changes: res.rowCount, lastInsertRowid: res.rows[0]?.id })),
            };
            return stmt;
        },
        transaction: (fn) => {
            return async () => {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    const result = await fn();
                    await client.query('COMMIT');
                    return result;
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                } finally {
                    client.release();
                }
            };
        },
        exec: (sql) => pool.query(sql),
        pragma: () => { }, // No-op for PostgreSQL
        close: () => pool.end()
    };
} else {
    // SQLite (default)
    const Database = require("better-sqlite3");
    const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.db");

    dbType = 'sqlite';
    db = new Database(DB_PATH, { fileMustExist: false });

    // Set safe PRAGMAs
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
}

module.exports = { db, dbType };
