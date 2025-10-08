/* eslint-disable no-console */
const { Client } = require('pg');

(async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        await client.query('BEGIN');

        // Seed plans table with basic plan (REMOVED - Digital Mailbox Plan is retired)
        // The migration 013_insert_default_plans.sql now handles plan creation

        // Optional: Add admin user (uncomment and set proper hash)
        // const bcryptHash = '$2b$10$replace_me_with_proper_hash';
        // await client.query(
        //   `INSERT INTO "user"(id, email, password, is_admin, role, created_at, updated_at) 
        //    VALUES(1, $1, $2, true, 'admin', $3, $3)
        //    ON CONFLICT (id) DO NOTHING`,
        //   ['admin@virtualaddresshub.co.uk', bcryptHash, Date.now()]
        // );

        await client.query('COMMIT');
        console.log('✅ PG seed completed');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ PG seed failed:', e?.message || e);
        throw e;
    } finally {
        await client.end();
    }
})();
