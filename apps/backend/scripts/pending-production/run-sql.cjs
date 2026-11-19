#!/usr/bin/env node
/*
 * Runs one of the 2026-11-18_phase1_render*.sql files where psql is not installed (e.g. a Render Shell),
 * with the same behaviour the files expect from `psql -X -v ON_ERROR_STOP=1`:
 *   - psql settings lines (\set, \pset) are skipped; \echo lines are printed when reached;
 *   - SQL runs in order on one connection; server NOTICEs are printed;
 *   - the first error stops the run with exit code 3. Closing the connection then rolls back any
 *     open transaction, so a failed migration keeps nothing, and the success \echo after COMMIT never prints.
 * Usage: node run-sql.cjs <file.sql>          (connection from DATABASE_URL; it is never printed)
 */
'use strict';
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: node run-sql.cjs <file.sql>'); process.exit(2); }
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(2); }
  const segments = [];
  let sql = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (t.startsWith('\\')) {
      if (sql.join('\n').trim()) segments.push({ sql: sql.join('\n') });
      sql = [];
      const echo = t.match(/^\\echo\s+'(.*)'\s*$/);
      if (echo) segments.push({ echo: echo[1] });
      continue;
    }
    sql.push(line);
  }
  if (sql.join('\n').trim()) segments.push({ sql: sql.join('\n') });

  const ssl = /sslmode=disable/.test(process.env.DATABASE_URL) || /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL)
    ? false : { rejectUnauthorized: false };
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl, application_name: 'vah-phase1-sql' });
  client.on('notice', n => console.log(`NOTICE:  ${n.message}`));
  await client.connect();
  if (process.env.VAH_REHEARSAL === 'on') await client.query("SET vah.rehearsal = 'on'");
  try {
    for (const s of segments) {
      if (s.echo !== undefined) { console.log(s.echo); continue; }
      const res = await client.query(s.sql);
      for (const r of [].concat(res)) if (r && r.command === 'SELECT' && r.rows.length) console.table(r.rows);
    }
  } catch (err) {
    console.error(`ERROR:  ${err.message}`);
    try { await client.end(); } catch { /* connection closed: open transaction is rolled back */ }
    process.exit(3);
  }
  await client.end();
}
main().catch(err => { console.error(`ERROR:  ${err.message}`); process.exit(3); });
