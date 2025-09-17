// server/db.ts — Postgres-only adapter with ? -> $n + IN (?) expansion + transactions
import { Pool, PoolClient, QueryResult } from 'pg';

type Param = any;
export type DBKind = 'pg';
export const DB_KIND: DBKind = 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required; Postgres-only mode is enabled.');

export const pool = new Pool({
  connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

function countQM(sql: string): number {
  let n = 0, s = false, d = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !d) { if (s && sql[i+1] === "'") { i++; continue; } s = !s; continue; }
    if (c === '"' && !s) { d = !d; continue; }
    if (!s && !d && c === '?') n++;
  }
  return n;
}
function convert(sql: string, params: Param[] = []) {
  const qm = countQM(sql);
  const isInOne = /\bIN\s*\(\s*\?\s*\)/i.test(sql);
  if (qm === 1 && isInOne && Array.isArray(params[0])) {
    const arr = params[0] as Param[];
    if (!arr.length) return { sql: sql.replace(/\bIN\s*\(\s*\?\s*\)/i, 'IN (NULL) AND 1=0'), params: [] };
    const ph = arr.map((_, i) => `$${i + 1}`).join(',');
    return { sql: sql.replace(/\bIN\s*\(\s*\?\s*\)/i, `IN (${ph})`), params: arr };
  }
  if (qm !== params.length) {
    throw new Error(`SQL/param mismatch: found ${qm} "?" but got ${params.length} params.\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`);
  }
  let i = 0, out = '', s = false, d = false;
  for (let k = 0; k < sql.length; k++) {
    const c = sql[k];
    if (c === "'" && !d) { if (s && sql[k+1] === "'") { out += "''"; k++; continue; } s = !s; out += c; continue; }
    if (c === '"' && !s) { d = !d; out += c; continue; }
    if (!s && !d && c === '?') { i++; out += `$${i}`; continue; }
    out += c;
  }
  return { sql: out, params };
}
async function withClient<T>(fn: (c: PoolClient) => Promise<T>) {
  const c = await pool.connect(); try { return await fn(c); } finally { c.release(); }
}

export const db: {
  kind: 'pg';
  run(sql: string, params?: Param[]): Promise<QueryResult>;
  get<T = any>(sql: string, params?: Param[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: Param[]): Promise<T[]>;
  transaction<T>(fn: (tx: typeof db) => Promise<T> | T): Promise<T>;
} = {
  kind: 'pg' as const,

  async run(sql: string, params?: Param[]) {
    const { sql: q, params: p } = convert(sql, params ?? []);
    return withClient((c) => c.query(q, p));
  },
  async get<T = any>(sql: string, params?: Param[]): Promise<T | undefined> {
    const { sql: q, params: p } = convert(sql, params ?? []);
    const { rows } = await withClient((c) => c.query(q, p));
    return (rows[0] as T) ?? undefined;
  },
  async all<T = any>(sql: string, params?: Param[]): Promise<T[]> {
    const { sql: q, params: p } = convert(sql, params ?? []);
    const { rows } = await withClient((c) => c.query(q, p));
    return rows as T[];
  },
  async transaction<T>(fn: (tx: typeof db) => Promise<T> | T): Promise<T> {
    return withClient(async (c) => {
      await c.query('BEGIN');
      try {
        const txDb = {
          kind: 'pg' as const,
          run: (sql: string, params?: Param[]) => { const { sql: q, params: p } = convert(sql, params ?? []); return c.query(q, p); },
          get: async <U = any>(sql: string, params?: Param[]) => { const { sql: q, params: p } = convert(sql, params ?? []); const r = await c.query(q, p); return (r.rows[0] as U) ?? undefined; },
          all: async <U = any>(sql: string, params?: Param[]) => { const { sql: q, params: p } = convert(sql, params ?? []); const r = await c.query(q, p); return r.rows as U[]; },
          transaction: async <U>(inner: (txi: typeof txDb) => Promise<U> | U) => inner(txDb),
        } as typeof db;
        const res = await fn(txDb);
        await c.query('COMMIT');
        return res;
      } catch (e) {
        await c.query('ROLLBACK'); throw e;
      }
    });
  },
};