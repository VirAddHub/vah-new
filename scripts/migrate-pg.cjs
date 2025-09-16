/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!/^postgres/i.test(DATABASE_URL || '')) {
    console.error('[pg-migrate] DATABASE_URL is not Postgres');
    process.exit(1);
}

const dir = path.join(__dirname, 'migrations-pg');
const files = fs.readdirSync(dir).filter(f => f.match(/^\d+_.*\.sql$/)).sort();

(async () => {
    const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    await client.query('BEGIN');
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id serial PRIMARY KEY,
        name text UNIQUE NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

        const { rows } = await client.query(`SELECT name FROM _migrations`);
        const applied = new Set(rows.map(r => r.name));

        for (const f of files) {
            if (applied.has(f)) { console.log('[pg-migrate] skip', f); continue; }
            const sql = fs.readFileSync(path.join(dir, f), 'utf8');
            console.log('[pg-migrate] apply', f);
            await client.query(sql);
            await client.query(`INSERT INTO _migrations(name) VALUES ($1)`, [f]);
        }

        await client.query('COMMIT');
        console.log('✅ PG migrations completed');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ PG migration failed:', err?.message || err);
        process.exit(1);
    } finally {
        await client.end();
    }
})();
