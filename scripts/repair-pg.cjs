#!/usr/bin/env node
/* Schema guard: ensure public.export_job.storage_expires_at does NOT exist */
const { Client } = require('pg');

(async () => {
  const cs = process.env.DATABASE_URL;
  if (!cs) { console.error('[repair] DATABASE_URL missing'); process.exit(1); }

  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const chk = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='export_job' AND column_name='storage_expires_at'
      LIMIT 1
    `);
    if (chk.rowCount) {
      console.error('[repair] storage_expires_at still exists — run 008_drop_storage_expires_at.sql');
      process.exit(1);
    }
    console.log('[repair] storage_expires_at column confirmed absent ✅');
    process.exit(0);
  } catch (e) {
    console.error('[repair] failed:', e?.message || e);
    process.exit(1);
  } finally {
    try { await client.end(); } catch { }
  }
})();