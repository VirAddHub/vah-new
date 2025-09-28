// server/db.ts
// Postgres-only database adapter with optional SQLite support for local dev
// - Primary: node-postgres (async) with `?` -> $n and IN (?) expansion
// - Optional: better-sqlite3 (sync) for local development only
//
// Public surface:
//   - db.prepare(sql).get(...args)
//   - db.prepare(sql).all(...args)
//   - db.prepare(sql).run(...args)
//   - db.get(sql, params?)
//   - db.all(sql, params?)
//   - db.run(sql, params?)
//   - db.transaction(fn)

import { Pool } from "pg";

// --- Postgres (primary) ---
export const pg = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres often needs SSL; this keeps it simple and safe:
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export async function pgQuery<T = any>(text: string, params?: any[]) {
  const res = await pg.query(text, params);
  return res;
}

// --- SQLite (disabled) ---
// We keep a guarded code-path for dev-only, but no top-level import.
const USE_SQLITE = process.env.DISABLE_SQLITE !== 'true' && (process.env.DATABASE_URL?.startsWith('sqlite') ?? false);

type SqliteDb = any;

let sqliteDb: SqliteDb | null = null;

export function getSqliteDb(): SqliteDb | null {
  if (!USE_SQLITE) return null;

  if (!sqliteDb) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // @ts-ignore: optional dev-only dependency
    const BetterSqlite3 = require("better-sqlite3");
    sqliteDb = new BetterSqlite3(process.env.SQLITE_DB_PATH || ":memory:");
  }
  return sqliteDb;
}

// ---------- Config ----------
type DBClient = 'pg' | 'sqlite';
const DB_CLIENT: DBClient = 'pg'; // Always use Postgres

// ---------- Utilities ----------
type Param = any;

function countQM(sql: string): number {
  let n = 0, s = false, d = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !d) { if (s && sql[i + 1] === "'") { i++; continue; } s = !s; continue; }
    if (c === '"' && !s) { d = !d; continue; }
    if (!s && !d && c === '?') n++;
  }
  return n;
}

/** For PG: convert `?` -> `$n`, expand single `IN (?)` with array param. */
function convertForPg(sql: string, params: Param[] = []): { sql: string; params: Param[] } {
  const qm = countQM(sql);
  const inOne = /\bIN\s*\(\s*\?\s*\)/i.test(sql);

  if (qm === 1 && inOne && Array.isArray(params[0])) {
    const arr = params[0] as Param[];
    if (!arr.length) {
      return { sql: sql.replace(/\bIN\s*\(\s*\?\s*\)/i, 'IN (NULL) AND 1=0'), params: [] };
    }
    const ph = arr.map((_, i) => `$${i + 1}`).join(',');
    return { sql: sql.replace(/\bIN\s*\(\s*\?\s*\)/i, `IN (${ph})`), params: arr };
  }

  if (qm !== params.length) {
    throw new Error(
      `SQL/param mismatch: found ${qm} "?" but got ${params.length} params.\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`
    );
  }

  let i = 0, out = '', s = false, d = false;
  for (let k = 0; k < sql.length; k++) {
    const c = sql[k];
    if (c === "'" && !d) { if (s && sql[k + 1] === "'") { out += "''"; k++; continue; } s = !s; out += c; continue; }
    if (c === '"' && !s) { d = !d; out += c; continue; }
    if (!s && !d && c === '?') { i++; out += `$${i}`; continue; }
    out += c;
  }
  return { sql: out, params };
}

// ---------- Driver bootstraps ----------
// Postgres is the primary and only database client
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for Postgres connection.');
}

async function withPgClient<T>(fn: (c: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const c = await pg.connect();

  // Monkey-patch query to log SQL on error (once per error)
  const origQuery = c.query.bind(c);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (c as any).query = async (text: string, params?: any[]) => {
    try {
      return await origQuery(text, params);
    } catch (e: any) {
      // Use safe logger to prevent recursion
      const { dbError } = require('./lib/safe-logger');
      dbError(e, text, params);
      throw e;
    }
  };

  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

// ---------- Public surface ----------
type PreparedAny = {
  /** Returns a single row (or undefined). For PG returns Promise<any|undefined>. */
  get: (...args: Param[]) => any;
  /** Returns array of rows. For PG returns Promise<any[]>. */
  all: (...args: Param[]) => any;
  /** Executes write. For PG returns Promise<QueryResult>. */
  run: (...args: Param[]) => any;
};

type DB = {
  client: DBClient;
  prepare: (sql: string) => PreparedAny;
  get: <T = any>(sql: string, params?: Param[]) => any;
  all: <T = any>(sql: string, params?: Param[]) => any;
  run: (sql: string, params?: Param[]) => any;
  transaction: <T>(fn: (tx: DB) => Promise<T> | T) => any;
};

// ---------- Implementations ----------
const db: DB = {
  client: 'pg',
  prepare(sql: string): PreparedAny {
    // Provide a facade so legacy call sites can switch by just adding `await`.
    return {
      get: async (...args: Param[]) => {
        try {
          const { sql: q, params: p } = convertForPg(sql, args);
          const { rows } = await withPgClient((c) => c.query(q, p));
          return rows[0];
        } catch (e: any) {
          console.error('[db.prepare.get] error:', e?.code, e?.message, '\nSQL:', sql, '\nParams:', args);
          throw e;
        }
      },
      all: async (...args: Param[]) => {
        try {
          const { sql: q, params: p } = convertForPg(sql, args);
          const { rows } = await withPgClient((c) => c.query(q, p));
          return rows;
        } catch (e: any) {
          console.error('[db.prepare.all] error:', e?.code, e?.message, '\nSQL:', sql, '\nParams:', args);
          throw e;
        }
      },
      run: async (...args: Param[]) => {
        try {
          const { sql: q, params: p } = convertForPg(sql, args);
          return withPgClient((c) => c.query(q, p));
        } catch (e: any) {
          console.error('[db.prepare.run] error:', e?.code, e?.message, '\nSQL:', sql, '\nParams:', args);
          throw e;
        }
      },
    };
  },
  async get<T = any>(sql: string, params?: Param[]) {
    try {
      const { sql: q, params: p } = convertForPg(sql, params ?? []);
      const { rows } = await withPgClient((c) => c.query(q, p));
      return (rows[0] as T) ?? undefined;
    } catch (e: any) {
      console.error('[db.get] error:', e?.code, e?.message, '\nSQL:', sql, '\nParams:', params);
      throw e;
    }
  },
  async all<T = any>(sql: string, params?: Param[]) {
    try {
      const { sql: q, params: p } = convertForPg(sql, params ?? []);
      const { rows } = await withPgClient((c) => c.query(q, p));
      return rows as T[];
    } catch (e: any) {
      // Use safe logger to prevent recursion
      const { dbError } = require('./lib/safe-logger');
      dbError(e, sql, params);
      throw e;
    }
  },
  async run(sql: string, params?: Param[]) {
    try {
      const { sql: q, params: p } = convertForPg(sql, params ?? []);
      return withPgClient((c) => c.query(q, p));
    } catch (e: any) {
      // Use safe logger to prevent recursion
      const { dbError } = require('./lib/safe-logger');
      dbError(e, sql, params);
      throw e;
    }
  },
  async transaction<T>(fn: (tx: DB) => Promise<T> | T): Promise<T> {
    return withPgClient(async (c) => {
      await c.query('BEGIN');
      try {
        const txDb: DB = {
          client: 'pg',
          prepare: (s) => ({
            get: async (...a) => {
              const { sql: q, params: p } = convertForPg(s, a);
              const { rows } = await c.query(q, p);
              return rows[0];
            },
            all: async (...a) => {
              const { sql: q, params: p } = convertForPg(s, a);
              const { rows } = await c.query(q, p);
              return rows;
            },
            run: async (...a) => {
              const { sql: q, params: p } = convertForPg(s, a);
              return c.query(q, p);
            },
          }),
          get: async (s, p) => {
            const { sql: q, params: pr } = convertForPg(s, p ?? []);
            const { rows } = await c.query(q, pr);
            return rows[0];
          },
          all: async (s, p) => {
            const { sql: q, params: pr } = convertForPg(s, p ?? []);
            const { rows } = await c.query(q, pr);
            return rows;
          },
          run: async (s, p) => {
            const { sql: q, params: pr } = convertForPg(s, p ?? []);
            return c.query(q, pr);
          },
          transaction: async (inner) => inner(txDb),
        };
        const res = await fn(txDb);
        await c.query('COMMIT');
        return res;
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  },
};

// Helper function to list tables (for schema validation)
async function listTables(): Promise<string[]> {
  // PostgreSQL only
  const { rows } = await withPgClient((c) =>
    c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
  );
  return rows.map((row: any) => row.tablename);
}

// Schema feature detection
export let HAS_STORAGE_EXPIRES = false;

// Call this once at boot to detect column presence
export async function detectSchemaFeatures() {
  try {
    const rows = await withPgClient(async (db) =>
      db.query(
        `SELECT 1
           FROM information_schema.columns
          WHERE table_schema='public'
            AND table_name='export_job'
            AND column_name='storage_expires_at'
          LIMIT 1`
      )
    );
    HAS_STORAGE_EXPIRES = Array.isArray(rows.rows) && rows.rows.length > 0;
    console.log(
      `[schema] export_job.storage_expires_at present: ${HAS_STORAGE_EXPIRES}`
    );
  } catch (e: any) {
    console.warn('[schema] feature detection failed:', e?.message || e);
  }
}

// Helper to build the expiry expression string safely
export function expiryExpr(alias = false) {
  // If the column exists, use COALESCE(storage_expires_at, expires_at)
  // If not, use expires_at only (avoid referencing a missing column!)
  const expr = HAS_STORAGE_EXPIRES
    ? 'COALESCE(storage_expires_at, expires_at)'
    : 'expires_at';
  return alias ? `${expr} AS expires_at_ms` : expr;
}

export { db, listTables, withPgClient };