// server/db.js — Database adapter that supports both SQLite and PostgreSQL
const path = require('path');

// Check if we should use PostgreSQL or SQLite
const isPg = process.env.DB_CLIENT === 'pg' || 
            process.env.DATABASE_URL?.startsWith('postgres://') || 
            process.env.DATABASE_URL?.startsWith('postgresql://');

let db;

if (isPg) {
  // PostgreSQL adapter
  const { Pool } = require('pg');
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL mode.');

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

  db = {
    kind: 'pg',

    async run(sql, params) {
      const { sql: q, params: p } = convert(sql, params ?? []);
      const result = await withClient((c) => c.query(q, p));
      // For PostgreSQL, return a compatible result object
      return {
        insertId: result.rows?.[0]?.id,
        lastInsertRowid: result.rows?.[0]?.id,
        rows: result.rows,
        rowCount: result.rowCount
      };
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
            run: async (sql, params) => { 
              const { sql: q, params: p } = convert(sql, params ?? []); 
              const result = await c.query(q, p);
              return {
                insertId: result.rows?.[0]?.id,
                lastInsertRowid: result.rows?.[0]?.id,
                rows: result.rows,
                rowCount: result.rowCount
              };
            },
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

    // SQLite-compatible prepare method for backward compatibility
    // WARNING: This is a compatibility layer that makes async operations look synchronous
    // This should be refactored to use proper async/await in the future
    prepare(sql) {
      console.warn('WARNING: Using db.prepare() with PostgreSQL. This is a compatibility layer and should be refactored to use async/await.');
      console.warn('Consider refactoring this code to use db.run(), db.get(), or db.all() with await.');
      
      return {
        run: (...params) => {
          throw new Error('db.prepare().run() is not supported with PostgreSQL. Use db.run() with await instead.');
        },
        get: (...params) => {
          throw new Error('db.prepare().get() is not supported with PostgreSQL. Use db.get() with await instead.');
        },
        all: (...params) => {
          throw new Error('db.prepare().all() is not supported with PostgreSQL. Use db.all() with await instead.');
        }
      };
    },
  };
} else {
  // SQLite adapter
  const Database = require('better-sqlite3');
  const { resolveDataDir } = require('./storage-paths');
  
  const DATA_DIR = resolveDataDir();
  const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'app.db');
  
  const sqliteDb = new Database(DB_FILE, { fileMustExist: false });
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  db = {
    kind: 'sqlite',
    
    run: (sql, params) => sqliteDb.prepare(sql).run(params),
    get: (sql, params) => sqliteDb.prepare(sql).get(params),
    all: (sql, params) => sqliteDb.prepare(sql).all(params),
    transaction: (fn) => {
      const transaction = sqliteDb.transaction(fn);
      return transaction();
    },
    prepare: (sql) => sqliteDb.prepare(sql),
  };
}

module.exports = { db, DB_KIND: isPg ? 'pg' : 'sqlite' };