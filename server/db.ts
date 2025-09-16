// server/db.ts
import { Pool } from 'pg';
import Database from 'better-sqlite3';

type DBKind = 'pg' | 'sqlite';

const DB_KIND: DBKind = process.env.DATABASE_URL ? 'pg' : 'sqlite';

let pg: Pool | null = null;
let sqlite: Database.Database | null = null;

if (DB_KIND === 'pg') {
  pg = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render requires SSL
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
} else {
  const path = process.env.DATABASE_URL || process.env.DB_PATH || process.env.SQLITE_PATH || 'vah.db';
  sqlite = new Database(path);
}

/**
 * Convert "?" placeholders to $1, $2, ... for Postgres.
 * Leaves the SQL untouched for SQLite.
 */
function normalizeSQL(sql: string, params?: any[]): { sql: string; params?: any[] } {
  if (DB_KIND !== 'pg' || !params || params.length === 0) return { sql, params };
  let i = 0;
  const converted = sql.replace(/\?/g, () => {
    i += 1;
    return `$${i}`;
  });
  return { sql: converted, params };
}

export const db = {
  kind: DB_KIND,

  async run(sql: string, params?: any[]) {
    if (DB_KIND === 'pg') {
      const { sql: q, params: p } = normalizeSQL(sql, params);
      const res = await pg!.query(q, p);
      return res;
    } else {
      const stmt = sqlite!.prepare(sql);
      return stmt.run(params ?? []);
    }
  },

  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    if (DB_KIND === 'pg') {
      const { sql: q, params: p } = normalizeSQL(sql, params);
      const res = await pg!.query(q, p);
      return (res.rows[0] as T) ?? undefined;
    } else {
      const stmt = sqlite!.prepare(sql);
      return (stmt.get(params ?? []) as T) ?? undefined;
    }
  },

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (DB_KIND === 'pg') {
      const { sql: q, params: p } = normalizeSQL(sql, params);
      const res = await pg!.query(q, p);
      return res.rows as T[];
    } else {
      const stmt = sqlite!.prepare(sql);
      return stmt.all(params ?? []) as T[];
    }
  },

  // Legacy compatibility methods for existing code
  prepare: (sql: string) => {
    if (DB_KIND === 'pg') {
      // PostgreSQL prepared statement simulation
      return {
        get: async (...params: any[]) => {
          // Handle both direct parameters (like SQLite) and object parameters
          const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) 
            ? Object.values(params[0]) 
            : params;
          const { sql: q, params: p } = normalizeSQL(sql, paramArray);
          const res = await pg!.query(q, p);
          return res.rows[0];
        },
        all: async (...params: any[]) => {
          // Handle both direct parameters (like SQLite) and object parameters
          const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) 
            ? Object.values(params[0]) 
            : params;
          const { sql: q, params: p } = normalizeSQL(sql, paramArray);
          const res = await pg!.query(q, p);
          return res.rows;
        },
        run: async (...params: any[]) => {
          // Handle both direct parameters (like SQLite) and object parameters
          const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) 
            ? Object.values(params[0]) 
            : params;
          const { sql: q, params: p } = normalizeSQL(sql, paramArray);
          const res = await pg!.query(q, p);
          return { changes: res.rowCount || 0, lastInsertRowid: res.rows[0]?.id };
        }
      };
    } else {
      // SQLite
      return sqlite!.prepare(sql);
    }
  },

  transaction: (fn: (...params: any[]) => any) => {
    if (DB_KIND === 'pg') {
      // PostgreSQL transaction
      return async () => {
        const client = await pg!.connect();
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
    } else {
      // SQLite
      return sqlite!.transaction(fn);
    }
  },

  exec: (sql: string) => {
    if (DB_KIND === 'pg') {
      // PostgreSQL doesn't have exec - use run instead
      if (!sql || !String(sql).trim()) {
        return Promise.resolve();
      }
      return db.run(sql);
    } else {
      return sqlite!.exec(sql);
    }
  },

  pragma: (sql: string) => {
    if (DB_KIND === 'pg') {
      // No-op for PostgreSQL
      return;
    } else {
      return sqlite!.pragma(sql);
    }
  },

  close: () => {
    if (DB_KIND === 'pg') {
      // No-op for PostgreSQL (pool manages connections)
      return;
    } else {
      return sqlite!.close();
    }
  }
};

// Cross-DB helper to list tables
export async function listTables(): Promise<string[]> {
  if (DB_KIND === 'pg') {
    const { rows } = await pg!.query(
      `select table_name as name
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'`
    );
    return rows.map((r: any) => r.name);
  } else {
    const rows = sqlite!.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
    return rows.map((r: any) => r.name);
  }
}

export default db;