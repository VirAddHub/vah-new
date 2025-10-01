// server/db.js
// Database adapter that provides SQLite-like API for PostgreSQL
// This allows legacy routes to work without complete rewriting

const { Pool } = require('pg');

let pool = null;

function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        pool = new Pool({
            connectionString,
            ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
        });
    }
    return pool;
}

// SQLite-compatible wrapper for PostgreSQL
class PostgreSQLiteAdapter {
    constructor() {
        this.pool = getPool();
    }

    // SQLite: db.prepare(sql).get(...params)
    // PostgreSQL: pool.query(sql, params) -> rows[0]
    prepare(sql) {
        const pool = this.pool;

        // Convert SQLite placeholders (?) to PostgreSQL ($1, $2, etc.)
        let paramIndex = 0;
        const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);

        return {
            get: async (...params) => {
                try {
                    const result = await pool.query(pgSql, params);
                    return result.rows[0] || null;
                } catch (error) {
                    console.error('[db.prepare.get] error:', error.message, { sql: pgSql, params });
                    throw error;
                }
            },

            all: async (...params) => {
                try {
                    const result = await pool.query(pgSql, params);
                    return result.rows;
                } catch (error) {
                    console.error('[db.prepare.all] error:', error.message, { sql: pgSql, params });
                    throw error;
                }
            },

            run: async (...params) => {
                try {
                    const result = await pool.query(pgSql, params);
                    return {
                        lastInsertRowid: result.rows[0]?.id || result.rowCount,
                        changes: result.rowCount
                    };
                } catch (error) {
                    console.error('[db.prepare.run] error:', error.message, { sql: pgSql, params });
                    throw error;
                }
            }
        };
    }

    // SQLite: db.exec(sql)
    // PostgreSQL: pool.query(sql)
    async exec(sql) {
        try {
            await this.pool.query(sql);
        } catch (error) {
            console.error('[db.exec] error:', error.message, { sql });
            throw error;
        }
    }

    async close() {
        if (pool) {
            await pool.end();
            pool = null;
        }
    }
}

// Export singleton instance
const db = new PostgreSQLiteAdapter();

// Also export for use in newer routes
async function withPgClient(callback) {
    const pool = getPool();
    const client = await pool.connect();
    try {
        return await callback(client);
    } finally {
        client.release();
    }
}

module.exports = { db, withPgClient, getPool };
