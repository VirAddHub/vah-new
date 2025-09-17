// server/db.ts — Postgres-only adapter with ? -> $n + IN (?) expansion + transactions
import { Pool, PoolClient, QueryResult } from 'pg';

type Param = any;

export type DBKind = 'pg';
export const DB_KIND: DBKind = 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

// Require PG in all modes (dev/prod). If you want to allow dev without PG, relax this guard.
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required; Postgres-only mode is enabled.');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

function countQuestionMarks(sql: string): number {
  let count = 0, single = false, dbl = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !dbl) { if (single && sql[i+1] === "'") { i++; continue; } single = !single; continue; }
    if (c === '"' && !single) { dbl = !dbl; continue; }
    if (!single && !dbl && c === '?') count++;
  }
  return count;
}

function convertPlaceholders(sql: string, params: Param[] = []): { sql: string; params: Param[] } {
  const qmCount = countQuestionMarks(sql);

  // Expand single IN (?) with array
  const inOneQm = /\bIN\s*\(\s*\?\s*\)/i.test(sql);
  if (qmCount === 1 && inOneQm && Array.isArray(params[0])) {
    const arr: Param[] = params[0];
    if (arr.length === 0) {
      const noMatchSql = sql.replace(/\bIN\s*\(\s*\?\s*\)/i, 'IN (NULL) AND 1=0');
      return { sql: noMatchSql, params: [] };
    }
    const placeholders = arr.map((_, i) => `$${i + 1}`).join(',');
    const newSql = sql.replace(/\bIN\s*\(\s*\?\s*\)/i, `IN (${placeholders})`);
    return { sql: newSql, params: arr };
  }

  if (qmCount !== params.length) {
    throw new Error(
      `SQL/param mismatch: found ${qmCount} "?" but got ${params.length} params.\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`
    );
  }

  // Replace unquoted ? with $n
  let i = 0, out = '', single = false, dbl = false;
  for (let idx = 0; idx < sql.length; idx++) {
    const c = sql[idx];
    if (c === "'" && !dbl) { if (single && sql[idx+1] === "'") { out += "''"; idx++; continue; } single = !single; out += c; continue; }
    if (c === '"' && !single) { dbl = !dbl; out += c; continue; }
    if (!single && !dbl && c === '?') { i += 1; out += `$${i}`; continue; }
    out += c;
  }
  return { sql: out, params };
}

async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { return await fn(client); } finally { client.release(); }
}

interface DatabaseInterface {
  kind: 'pg';
  run(sql: string, params?: Param[]): Promise<QueryResult>;
  get<T = any>(sql: string, params?: Param[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: Param[]): Promise<T[]>;
  transaction<T>(fn: (tx: DatabaseInterface) => Promise<T> | T): Promise<T>;
}

export const db: DatabaseInterface = {
  kind: 'pg',

  async run(sql: string, params?: Param[]) {
    const { sql: q, params: p } = convertPlaceholders(sql, params ?? []);
    const res: QueryResult = await withClient((c) => c.query(q, p));
    return res;
  },

  async get<T = any>(sql: string, params?: Param[]): Promise<T | undefined> {
    const { sql: q, params: p } = convertPlaceholders(sql, params ?? []);
    const res: QueryResult = await withClient((c) => c.query(q, p));
    return (res.rows[0] as T) ?? undefined;
  },

  async all<T = any>(sql: string, params?: Param[]): Promise<T[]> {
    const { sql: q, params: p } = convertPlaceholders(sql, params ?? []);
    const res: QueryResult = await withClient((c) => c.query(q, p));
    return res.rows as T[];
  },

  async transaction<T>(fn: (tx: DatabaseInterface) => Promise<T> | T): Promise<T> {
    return withClient(async (c) => {
      await c.query('BEGIN');
      try {
        const txDb: DatabaseInterface = {
          kind: 'pg',
          run: (sql: string, params?: Param[]) => {
            const { sql: q, params: p } = convertPlaceholders(sql, params ?? []);
            return c.query(q, p);
          },
          get: async <U = any>(sql: string, params?: Param[]) => {
            const { sql: q, params: p } = convertPlaceholders(sql, params ?? []);
            const res = await c.query(q, p);
            return (res.rows[0] as U) ?? undefined;
          },
          all: async <U = any>(sql: string, params?: Param[]) => {
            const { sql: q, params: p } = convertPlaceholders(sql, params ?? []);
            const res = await c.query(q, p);
            return res.rows as U[];
          },
          transaction: async <U>(inner: (txi: DatabaseInterface) => Promise<U> | U) => inner(txDb),
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

// Legacy compatibility methods for existing code
export const legacyDb = {
  kind: 'pg' as const,

  async run(sql: string, params?: any[]) {
    return db.run(sql, params);
  },

  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    return db.get<T>(sql, params);
  },

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return db.all<T>(sql, params);
  },

  // Legacy compatibility methods for existing code
  prepare: (sql: string) => {
    // PostgreSQL prepared statement simulation
    return {
      get: async (...params: any[]) => {
        // Handle both direct parameters (like SQLite) and object parameters
        const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) 
          ? Object.values(params[0]) 
          : params;
        return db.get(sql, paramArray);
      },
      all: async (...params: any[]) => {
        // Handle both direct parameters (like SQLite) and object parameters
        const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) 
          ? Object.values(params[0]) 
          : params;
        return db.all(sql, paramArray);
      },
      run: async (...params: any[]) => {
        // Handle both direct parameters (like SQLite) and object parameters
        const paramArray = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) 
          ? Object.values(params[0]) 
          : params;
        const result = await db.run(sql, paramArray);
        return { changes: result.rowCount || 0, lastInsertRowid: result.rows?.[0]?.id };
      }
    };
  },

  transaction: (fn: (...params: any[]) => any) => {
    // PostgreSQL transaction
    return async () => {
      return db.transaction(async (tx: DatabaseInterface) => {
        return fn();
      });
    };
  },

  exec: (sql: string) => {
    // PostgreSQL doesn't have exec - use run instead
    if (!sql || !String(sql).trim()) {
      return Promise.resolve();
    }
    return db.run(sql);
  },

  pragma: (sql: string) => {
    // No-op for PostgreSQL
    return;
  },

  close: () => {
    // No-op for PostgreSQL (pool manages connections)
    return;
  }
};

// Cross-DB helper to list tables
export async function listTables(): Promise<string[]> {
  const { rows } = await pool.query(
    `select table_name as name
     from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'`
  );
  return rows.map((r: any) => r.name);
}

export default db;