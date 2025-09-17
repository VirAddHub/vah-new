/* eslint-disable no-console */
const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
        await client.query('BEGIN');

        // Enable pgcrypto extension for bcrypt
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        // Create admin user
        const adminEmail = 'admin@yourdomain.com';
        const adminPassword = 'CHANGE_ME_AFTER_FIRST_LOGIN';
        const adminHash = await bcrypt.hash(adminPassword, 10);
        const now = Math.floor(Date.now());

        await client.query(`
            INSERT INTO "user" (email, password, first_name, last_name, role, is_admin, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (email) DO UPDATE
            SET role = EXCLUDED.role, 
                is_admin = EXCLUDED.is_admin, 
                status = EXCLUDED.status, 
                updated_at = EXCLUDED.updated_at
        `, [
            adminEmail,
            adminHash,
            'Site',
            'Admin',
            'admin',
            true,
            'active',
            now,
            now
        ]);

        // Create worker user
        const workerEmail = 'worker@yourdomain.com';
        const workerPassword = 'CHANGE_ME_AFTER_FIRST_LOGIN';
        const workerHash = await bcrypt.hash(workerPassword, 10);

        await client.query(`
            INSERT INTO "user" (email, password, first_name, last_name, role, is_admin, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (email) DO UPDATE
            SET role = EXCLUDED.role, 
                is_admin = EXCLUDED.is_admin, 
                status = EXCLUDED.status, 
                updated_at = EXCLUDED.updated_at
        `, [
            workerEmail,
            workerHash,
            'Ops',
            'Worker',
            'worker',
            false,
            'active',
            now,
            now
        ]);

        await client.query('COMMIT');
        console.log('✅ Admin and worker users created successfully');
        console.log(`Admin: ${adminEmail} / ${adminPassword}`);
        console.log(`Worker: ${workerEmail} / ${workerPassword}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ User creation failed:', e?.message || e);
        throw e;
    } finally {
        await client.end();
    }
})();
