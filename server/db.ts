// PG-safe database module with lazy SQLite require
// Detects driver and only loads SQLite when needed

const DATABASE_URL = process.env.DATABASE_URL || '';
const IS_PG = /^postgres/i.test(DATABASE_URL);

let instance: any;

// Lazy SQLite loader - only called when needed
function sqlite() {
    if (instance) return instance;
    
    // Only require better-sqlite3 when actually using SQLite
    const Database = require('better-sqlite3');
    const { resolveDbPath } = require('./dbPath');
    
    const dbFile = resolveDbPath(DATABASE_URL);
    console.info('info: Using SQLite database file', {
        service: 'vah-backend',
        path: dbFile,
        cwd: process.cwd(),
        timestamp: new Date().toISOString(),
    });

    instance = new Database(dbFile, { fileMustExist: false });

    // Make SQLite more resilient
    try {
        instance.pragma('busy_timeout = 5000');     // wait up to 5s on lock
        instance.pragma('journal_mode = WAL');      // robust journaling for concurrent readers
        instance.pragma('synchronous = NORMAL');    // good balance for WAL
    } catch (e) {
        // non-fatal; just log
        console.warn('SQLite PRAGMAs failed to apply:', e);
    }

    return instance;
}

// PostgreSQL query function
async function pgQuery(sql: string, params: any[] = []) {
    if (!sql || !String(sql).trim()) {
        return [];
    }
    
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        const result = await pool.query(sql, params);
        return result.rows;
    } catch (err) {
        if (process.env.DEBUG_SQL) {
            console.error('[SQL FAILED]', String(sql));
            if (params && params.length) console.error('[PARAMS]', params);
        }
        throw err;
    } finally {
        await pool.end();
    }
}

// Database interface that works for both SQLite and PostgreSQL
const db = {
    // Common interface
    prepare: (sql: string) => {
        if (IS_PG) {
            // PostgreSQL prepared statement simulation
            return {
                get: async (params: any = {}) => {
                    const rows = await pgQuery(sql, Object.values(params));
                    return rows[0];
                },
                all: async (params: any = {}) => {
                    return await pgQuery(sql, Object.values(params));
                },
                run: async (params: any = {}) => {
                    const rows = await pgQuery(sql, Object.values(params));
                    return { changes: rows.length, lastInsertRowid: rows[0]?.id };
                }
            };
        } else {
            // SQLite
            const sqliteDb = sqlite();
            return sqliteDb.prepare(sql);
        }
    },
    
    transaction: (fn: Function) => {
        if (IS_PG) {
            // PostgreSQL transaction
            return async () => {
                const { Pool } = require('pg');
                const pool = new Pool({
                    connectionString: DATABASE_URL,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
                
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
                    await pool.end();
                }
            };
        } else {
            // SQLite
            const sqliteDb = sqlite();
            return sqliteDb.transaction(fn);
        }
    },
    
    exec: (sql: string) => {
        if (IS_PG) {
            // PostgreSQL doesn't have exec - use pgQuery instead
            if (!sql || !String(sql).trim()) {
                return Promise.resolve();
            }
            return pgQuery(sql);
        } else {
            const sqliteDb = sqlite();
            return sqliteDb.exec(sql);
        }
    },
    
    pragma: (sql: string) => {
        if (IS_PG) {
            // No-op for PostgreSQL
            return;
        } else {
            const sqliteDb = sqlite();
            return sqliteDb.pragma(sql);
        }
    },
    
    close: () => {
        if (IS_PG) {
            // No-op for PostgreSQL (pool manages connections)
            return;
        } else {
            const sqliteDb = sqlite();
            return sqliteDb.close();
        }
    }
};

// Hard guard: if core tables are missing, guide the operator to prepare the DB
if (!IS_PG) {
    // Only check SQLite schema
    const sqliteDb = sqlite();
    const rows = sqliteDb.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as Array<{ name: string }>;
    const names = new Set(rows.map(r => r.name));
    const missing: string[] = [];
    for (const t of ['user', 'mail_item', 'admin_log', 'mail_event', 'activity_log']) {
        if (!names.has(t) && !names.has(t + 's')) missing.push(t);
    }
    if (missing.length) {
        console.error('❌ DB schema missing tables:', missing);
        console.error('Run: npm run db:init');
        process.exit(1);
    }
}

// Cross-DB helper to list tables
export async function listTables(): Promise<string[]> {
    if (IS_PG) {
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        try {
            const { rows } = await pool.query(
                `select table_name as name
                 from information_schema.tables
                 where table_schema = 'public' and table_type = 'BASE TABLE'`
            );
            return rows.map((r: any) => r.name);
        } finally {
            await pool.end();
        }
    } else {
        const sqliteDb = sqlite();
        const rows = sqliteDb.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
        return rows.map((r: any) => r.name);
    }
}

// ✅ Export in a way that supports BOTH styles safely:
//
//   const { db } = require('../db')   // preferred
//   const db = require('../db').db    // also ok
//   const db = require('../db')       // ALSO ok (default points to the same instance)

export { db };
export default db;