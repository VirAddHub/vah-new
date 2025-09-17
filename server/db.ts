// server/db.ts
import { Pool, PoolClient, QueryResult } from 'pg';
import Database from 'better-sqlite3';

type DBKind = 'pg' | 'sqlite';
type Param = any;

interface DB {
  kind: DBKind;
  run(sql: string, params?: Param[]): Promise<any>;
  get<T = any>(sql: string, params?: Param[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: Param[]): Promise<T[]>;
  transaction<T>(fn: (tx: DB) => Promise<T> | T): Promise<T>;
}

const DB_KIND: DBKind = process.env.DATABASE_URL ? 'pg' : 'sqlite';

let pgPool: Pool | null = null;
let sqlite: Database.Database | null = null;

if (DB_KIND === 'pg') {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
} else {
  const path =
    process.env.DB_PATH ||
    process.env.SQLITE_PATH ||
    'vah.db';
  sqlite = new Database(path);
}

/**
 * Count unquoted "?" placeholders (skip 'single' and "double" quotes).
 */
function countQuestionMarks(sql: string): number {
  let count = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !inDouble) {
      // handle escaped single quotes ''
      if (inSingle && sql[i + 1] === "'") { i++; continue; }
      inSingle = !inSingle;
      continue;
    }
    if (c === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && c === '?') count++;
  }
  return count;
}

/**
 * Convert "?" to $1..$n, optionally expanding "IN (?)" if params[0] is array.
 * Skips quoted strings.
 */
function convertPlaceholdersForPG(sql: string, params: Param[] = []): { sql: string; params: Param[] } {
  // Expand IN (?) if exactly one placeholder and first param is array
  const qmCount = countQuestionMarks(sql);

  // Special-case: IN (?) with array params -> expand list
  const inOneQm = /\bIN\s*\(\s*\?\s*\)/i.test(sql);
  if (qmCount === 1 && inOneQm && Array.isArray(params[0])) {
    const arr: Param[] = params[0];
    if (arr.length === 0) {
      // Empty IN () -> always false
      const noMatchSql = sql.replace(/\bIN\s*\(\s*\?\s*\)/i, 'IN (NULL) AND 1=0');
      return { sql: noMatchSql, params: [] };
    }
    const placeholders = arr.map((_, i) => `$${i + 1}`).join(',');
    const newSql = sql.replace(/\bIN\s*\(\s*\?\s*\)/i, `IN (${placeholders})`);
    return { sql: newSql, params: arr };
  }

  // General path: 1-to-1 mapping of ? to params
  if (qmCount !== params.length) {
    // Helpful diagnostic error before sending broken queries to PG
    throw new Error(
      `SQL/param mismatch: found ${qmCount} "?" but got ${params.length} params.\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`
    );
  }

  // Replace unquoted ? with $n
  let i = 0;
  let out = '';
  let inSingle = false;
  let inDouble = false;
  for (let idx = 0; idx < sql.length; idx++) {
    const c = sql[idx];
    if (c === "'" && !inDouble) {
      // Handle escaped ''
      if (inSingle && sql[idx + 1] === "'") { out += "''"; idx++; continue; }
      inSingle = !inSingle; out += c; continue;
    }
    if (c === '"' && !inSingle) {
      inDouble = !inDouble; out += c; continue;
    }
    if (!inSingle && !inDouble && c === '?') {
      i += 1;
      out += `$${i}`;
      continue;
    }
    out += c;
  }
  return { sql: out, params };
}

async function withPgClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pgPool!.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

const pgDb: DB = {
  kind: 'pg',
  async run(sql: string, params?: Param[]) {
    const { sql: q, params: p } = convertPlaceholdersForPG(sql, params ?? []);
    const res: QueryResult = await withPgClient((c) => c.query(q, p));
    return res;
  },
  async get<T = any>(sql: string, params?: Param[]) {
    const { sql: q, params: p } = convertPlaceholdersForPG(sql, params ?? []);
    const res: QueryResult = await withPgClient((c) => c.query(q, p));
    return (res.rows[0] as T) ?? undefined;
  },
  async all<T = any>(sql: string, params?: Param[]) {
    const { sql: q, params: p } = convertPlaceholdersForPG(sql, params ?? []);
    const res: QueryResult = await withPgClient((c) => c.query(q, p));
    return res.rows as T[];
  },
  async transaction<T>(fn: (tx: DB) => Promise<T> | T): Promise<T> {
    return await withPgClient(async (c) => {
      await c.query('BEGIN');
      try {
        // TX-bound runner
        const txDb: DB = {
          kind: 'pg',
          run: (sql, params) => {
            const { sql: q, params: p } = convertPlaceholdersForPG(sql, params ?? []);
            return c.query(q, p);
          },
          get: async (sql, params) => {
            const { sql: q, params: p } = convertPlaceholdersForPG(sql, params ?? []);
            const res = await c.query(q, p);
            return res.rows[0] ?? undefined;
          },
          all: async (sql, params) => {
            const { sql: q, params: p } = convertPlaceholdersForPG(sql, params ?? []);
            const res = await c.query(q, p);
            return res.rows as any[];
          },
          transaction: async (inner) => {
            // Nested: just run within same tx (PG supports savepoints if needed)
            return inner(txDb);
          },
        };
        const result = await fn(txDb);
        await c.query('COMMIT');
        return result;
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  },
};

const sqliteDb: DB = {
  kind: 'sqlite',
  async run(sql: string, params?: Param[]) {
    const stmt = sqlite!.prepare(sql);
    return stmt.run(params ?? []);
  },
  async get<T = any>(sql: string, params?: Param[]) {
    const stmt = sqlite!.prepare(sql);
    return (stmt.get(params ?? []) as T) ?? undefined;
  },
  async all<T = any>(sql: string, params?: Param[]) {
    const stmt = sqlite!.prepare(sql);
    return stmt.all(params ?? []) as T[];
  },
  async transaction<T>(fn: (tx: DB) => Promise<T> | T): Promise<T> {
    // Manual transaction (avoids type mismatch with better-sqlite3 .transaction)
    sqlite!.exec('BEGIN');
    try {
      const txDb: DB = {
        kind: 'sqlite',
        run: async (sql, params) => sqlite!.prepare(sql).run(params ?? []),
        get: async <T = any>(sql: string, params?: Param[]) => (sqlite!.prepare(sql).get(params ?? []) as T) ?? undefined,
        all: async <T = any>(sql: string, params?: Param[]) => sqlite!.prepare(sql).all(params ?? []) as T[],
        transaction: async (inner) => inner(txDb), // simple nesting
      };
      const res = await fn(txDb);
      sqlite!.exec('COMMIT');
      return res;
    } catch (e) {
      try { sqlite!.exec('ROLLBACK'); } catch { }
      throw e;
    }
  },
};

// Legacy compatibility methods for existing code
export const legacyDb = {
  kind: DB_KIND,

  async run(sql: string, params?: any[]) {
    return newDb.run(sql, params);
  },

  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    return newDb.get<T>(sql, params);
  },

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return newDb.all<T>(sql, params);
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
          return newDb.get(sql, paramArray);
        },
        all: async (...params: any[]) => {
          // Handle both direct parameters (like SQLite) and object parameters
          const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])
            ? Object.values(params[0])
            : params;
          return newDb.all(sql, paramArray);
        },
        run: async (...params: any[]) => {
          // Handle both direct parameters (like SQLite) and object parameters
          const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])
            ? Object.values(params[0])
            : params;
          const result = await newDb.run(sql, paramArray);
          return { changes: result.rowCount || 0, lastInsertRowid: result.rows?.[0]?.id };
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
        return newDb.transaction(async (tx) => {
          return fn();
        });
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
      return newDb.run(sql);
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
    const { rows } = await pgPool!.query(
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

// Export the new interface
export const newDb: DB = DB_KIND === 'pg' ? pgDb : sqliteDb;

// Export the legacy interface for backward compatibility with existing server code
export { legacyDb as db };

export default newDb;