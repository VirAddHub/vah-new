// server/db.ts
// Unified DB adapter compatible with legacy SQLite-style `prepare()`
// - DB_CLIENT=sqlite  -> better-sqlite3 (sync)
// - DB_CLIENT=pg      -> node-postgres (async) with `?` -> $n and IN (?) expansion
//
// Both clients expose the same public surface:
//   - db.prepare(sql).get(...args)
//   - db.prepare(sql).all(...args)
//   - db.prepare(sql).run(...args)
//   - db.get(sql, params?)
//   - db.all(sql, params?)
//   - db.run(sql, params?)
//   - db.transaction(fn)

import type { QueryResult } from 'pg';

// ---------- Config ----------
type DBClient = 'pg' | 'sqlite';
const DB_CLIENT: DBClient =
  (process.env.DB_CLIENT as DBClient) ||
  (process.env.DATABASE_URL ? 'pg' : 'sqlite');

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
let sqlite: import('better-sqlite3').Database | null = null;
let pgPool: import('pg').Pool | null = null;

if (DB_CLIENT === 'sqlite') {
  // NOTE: keep path configurable via env for local dev; do NOT use in production.
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const SQLITE_PATH =
    process.env.SQLITE_PATH || process.env.DB_PATH || 'app.db';
  sqlite = new Database(SQLITE_PATH);
} else {
  const { Pool } = require('pg') as typeof import('pg');
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required when DB_CLIENT=pg.');
  }
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
  });
}

async function withPgClient<T>(fn: (c: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const c = await pgPool!.connect();
  try { return await fn(c); } finally { c.release(); }
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
const db: DB = ((): DB => {
  if (DB_CLIENT === 'sqlite') {
    // ---- SQLite (sync) ----
    return {
      client: 'sqlite',
      prepare(sql: string): PreparedAny {
        const stmt = sqlite!.prepare(sql);
        return {
          get: (...args: Param[]) => stmt.get(...args),
          all: (...args: Param[]) => stmt.all(...args),
          run: (...args: Param[]) => stmt.run(...args),
        };
      },
      get<T = any>(sql: string, params?: Param[]): T | undefined {
        return sqlite!.prepare(sql).get(...(params ?? [])) as T | undefined;
      },
      all<T = any>(sql: string, params?: Param[]): T[] {
        return sqlite!.prepare(sql).all(...(params ?? [])) as T[];
      },
      run(sql: string, params?: Param[]) {
        return sqlite!.prepare(sql).run(...(params ?? []));
      },
      transaction<T>(fn: (tx: DB) => Promise<T> | T) {
        // Use manual transaction to keep the same DB surface
        sqlite!.exec('BEGIN');
        try {
          const txDb: DB = {
            client: 'sqlite',
            prepare: (s) => {
              const st = sqlite!.prepare(s);
              return {
                get: (...a) => st.get(...a),
                all: (...a) => st.all(...a),
                run: (...a) => st.run(...a),
              };
            },
            get: (s, p) => sqlite!.prepare(s).get(...(p ?? [])) as any,
            all: (s, p) => sqlite!.prepare(s).all(...(p ?? [])) as any,
            run: (s, p) => sqlite!.prepare(s).run(...(p ?? [])),
            transaction: (inner) => inner(txDb), // no nested savepoints for simplicity
          };
          const res = fn(txDb);
          // if fn is async, you can await it here, but sqlite path is typically sync
          if (res && typeof (res as any).then === 'function') {
            // If someone passed async fn by mistake, block until it resolves
            // (rare, but avoids leaving tx open)
            (res as Promise<T>).then(
              () => sqlite!.exec('COMMIT'),
              () => sqlite!.exec('ROLLBACK')
            );
            return res;
          } else {
            sqlite!.exec('COMMIT');
            return res as T;
          }
        } catch (e) {
          try { sqlite!.exec('ROLLBACK'); } catch {}
          throw e;
        }
      },
    };
  }

  // ---- Postgres (async) ----
  return {
    client: 'pg',
    prepare(sql: string): PreparedAny {
      // Provide a facade so legacy call sites can switch by just adding `await`.
      return {
        get: async (...args: Param[]) => {
          const { sql: q, params: p } = convertForPg(sql, args);
          const { rows } = await withPgClient((c) => c.query(q, p));
          return rows[0];
        },
        all: async (...args: Param[]) => {
          const { sql: q, params: p } = convertForPg(sql, args);
          const { rows } = await withPgClient((c) => c.query(q, p));
          return rows;
        },
        run: async (...args: Param[]) => {
          const { sql: q, params: p } = convertForPg(sql, args);
          return withPgClient((c) => c.query(q, p));
        },
      };
    },
    async get<T = any>(sql: string, params?: Param[]) {
      const { sql: q, params: p } = convertForPg(sql, params ?? []);
      const { rows } = await withPgClient((c) => c.query(q, p));
      return (rows[0] as T) ?? undefined;
    },
    async all<T = any>(sql: string, params?: Param[]) {
      const { sql: q, params: p } = convertForPg(sql, params ?? []);
      const { rows } = await withPgClient((c) => c.query(q, p));
      return rows as T[];
    },
    async run(sql: string, params?: Param[]) {
      const { sql: q, params: p } = convertForPg(sql, params ?? []);
      return withPgClient((c) => c.query(q, p));
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
})();

export { db, DB_CLIENT };