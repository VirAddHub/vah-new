#!/usr/bin/env node
/* Ensure compat column exists (stability while old builds may still run) */
const { Client } = require('pg');

(async () => {
  const cs = process.env.DATABASE_URL;
  if (!cs) { console.error('[repair] DATABASE_URL missing'); process.exit(1); }

  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();

    await client.query(`
      ALTER TABLE public.export_job
        ADD COLUMN IF NOT EXISTS storage_expires_at bigint GENERATED ALWAYS AS (expires_at) STORED;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS export_job_storage_expires_idx
        ON public.export_job (storage_expires_at);
    `);

    console.log('[repair] storage_expires_at ensured ✅');
    process.exit(0);
  } catch (e) {
    console.error('[repair] failed:', e?.message || e); process.exit(1);
  } finally {
    try { await client.end(); } catch {}
  }
})();