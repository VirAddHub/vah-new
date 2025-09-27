// server/db.js — PostgreSQL-only database adapter (NO SQLite support)
const { Pool } = require('pg');

// Hard fail if DATABASE_URL is missing or not PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. This app does NOT support SQLite.');
}

if (!DATABASE_URL.startsWith('postgres')) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string. SQLite is not supported.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

function isPgPlaceholderSql(sql) {
  // naive but effective: if it contains $<number>, treat as PG already
  return /\$\d+/.test(sql);
}

function countQM(sql) {
  let n = 0, s = false, d = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !d) { if (s && sql[i + 1] === "'") { i++; continue; } s = !s; continue; }
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
    if (c === "'" && !d) { if (s && sql[k + 1] === "'") { out += "''"; k++; continue; } s = !s; out += c; continue; }
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

// Safe query helpers that detect PG placeholders and skip conversion
async function query(sql, params = []) {
  // Legacy API: auto-convert '?' to $1 (SQLite-style callers)
  if (isPgPlaceholderSql(sql)) {
    // already PG-style, do NOT convert
    return pool.query(sql, params);
  }
  const { sql: text, params: values } = convert(sql, params); // your current converter
  return pool.query(text, values);
}

// Convenience wrappers (match your old db.get/db.all style)
async function one(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows[0] || null;
}

async function many(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows;
}

db = {
  kind: 'pg',

  async run(sql, params) {
    const result = await query(sql, params ?? []);
    // For PostgreSQL, return a compatible result object
    return {
      insertId: result.rows?.[0]?.id,
      lastInsertRowid: result.rows?.[0]?.id,
      rows: result.rows,
      rowCount: result.rowCount
    };
  },
  async get(sql, params) {
    return await one(sql, params ?? []);
  },
  async all(sql, params) {
    return await many(sql, params ?? []);
  },
  async transaction(fn) {
    return withClient(async (c) => {
      await c.query('BEGIN');
      try {
        const txDb = {
          kind: 'pg',
          run: async (sql, params) => {
            // Use safe query for transactions too
            let result;
            if (isPgPlaceholderSql(sql)) {
              result = await c.query(sql, params ?? []);
            } else {
              const { sql: q, params: p } = convert(sql, params ?? []);
              result = await c.query(q, p);
            }
            return {
              insertId: result.rows?.[0]?.id,
              lastInsertRowid: result.rows?.[0]?.id,
              rows: result.rows,
              rowCount: result.rowCount
            };
          },
          get: async (sql, params) => {
            let result;
            if (isPgPlaceholderSql(sql)) {
              result = await c.query(sql, params ?? []);
            } else {
              const { sql: q, params: p } = convert(sql, params ?? []);
              result = await c.query(q, p);
            }
            return result.rows[0] ?? undefined;
          },
          all: async (sql, params) => {
            let result;
            if (isPgPlaceholderSql(sql)) {
              result = await c.query(sql, params ?? []);
            } else {
              const { sql: q, params: p } = convert(sql, params ?? []);
              result = await c.query(q, p);
            }
            return result.rows;
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

  // PostgreSQL-only: No SQLite compatibility methods
  // Use db.run(), db.get(), db.all() with await instead of db.prepare()
};

module.exports = {
  db,
  DB_KIND: 'pg',
  query,
  one,
  many,
  pool // export in case you want direct access
};