// server/db.js — Postgres-only adapter with ? -> $n + IN (?) expansion + transactions
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required; Postgres-only mode is enabled.');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

function countQM(sql) {
  let n = 0, s = false, d = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !d) { if (s && sql[i+1] === "'") { i++; continue; } s = !s; continue; }
    if (c === '"' && !s) { d = !d; continue; }
    if (!s && !d && c === '?') n++;
  }
  return n;
}

function convert(sql, params = []) {
  const qm = countQM(sql);
  const isInOne = /\bIN\s*\(\s*\?\s*\)/i.test(sql);
  if (qm === 1 && isInOne && Array.isArray(params[0])) {
    const arr = params[0];
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

async function withClient(fn) {
  const c = await pool.connect(); 
  try { 
    return await fn(c); 
  } finally { 
    c.release(); 
  }
}

const db = {
  kind: 'pg',

  async run(sql, params) {
    const { sql: q, params: p } = convert(sql, params ?? []);
    return withClient((c) => c.query(q, p));
  },
  async get(sql, params) {
    const { sql: q, params: p } = convert(sql, params ?? []);
    const { rows } = await withClient((c) => c.query(q, p));
    return rows[0] ?? undefined;
  },
  async all(sql, params) {
    const { sql: q, params: p } = convert(sql, params ?? []);
    const { rows } = await withClient((c) => c.query(q, p));
    return rows;
  },
  async transaction(fn) {
    return withClient(async (c) => {
      await c.query('BEGIN');
      try {
        const txDb = {
          kind: 'pg',
          run: (sql, params) => { const { sql: q, params: p } = convert(sql, params ?? []); return c.query(q, p); },
          get: async (sql, params) => { const { sql: q, params: p } = convert(sql, params ?? []); const r = await c.query(q, p); return r.rows[0] ?? undefined; },
          all: async (sql, params) => { const { sql: q, params: p } = convert(sql, params ?? []); const r = await c.query(q, p); return r.rows; },
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

module.exports = { db, DB_KIND: 'pg' };
