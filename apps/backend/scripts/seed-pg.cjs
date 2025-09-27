/* eslint-disable no-console */
const { Client } = require('pg');

(async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        await client.query('BEGIN');

        // Seed plans table with basic plan
        await client.query(`
      INSERT INTO plans (id, slug, name, description, price_pence, currency, active, interval)
      VALUES (1, 'digital_mailbox', 'Digital Mailbox Plan', 'Basic digital mailbox service', 999, 'GBP', true, 'month')
      ON CONFLICT (id) DO UPDATE
      SET slug=EXCLUDED.slug, 
          name=EXCLUDED.name, 
          description=EXCLUDED.description, 
          price_pence=EXCLUDED.price_pence, 
          currency=EXCLUDED.currency, 
          active=EXCLUDED.active, 
          interval=EXCLUDED.interval;
    `);

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
