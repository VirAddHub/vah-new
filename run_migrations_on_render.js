#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    console.log('🚀 Starting forwarding system migrations on Render...');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not set');
        process.exit(1);
    }

    console.log('✅ DATABASE_URL is set');

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Run migrations in order
        const migrations = [
            '025_forwarding_charges.sql',
            '026_enhanced_forwarding_system.sql',
            '027_admin_forwarding_system.sql',
            '028_forwarding_perf.sql',
            '029_forwarding_trigger.sql'
        ];

        await client.query('BEGIN;');
        console.log('🔄 Started transaction');

        for (const migration of migrations) {
            const migrationPath = path.join(__dirname, 'migrations', migration);

            if (!fs.existsSync(migrationPath)) {
                console.error(`❌ Migration file not found: ${migrationPath}`);
                throw new Error(`Migration file not found: ${migration}`);
            }

            console.log(`📋 Running migration: ${migration}`);
            const sql = fs.readFileSync(migrationPath, 'utf8');
            await client.query(sql);
            console.log(`✅ Completed: ${migration}`);
        }

        await client.query('COMMIT;');
        console.log('✅ All migrations committed successfully');

        // Verify tables were created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'forwarding%' 
            ORDER BY table_name
        `);

        console.log('📊 Created tables:', result.rows.map(r => r.table_name));

        if (result.rows.length >= 3) {
            console.log('🎉 Forwarding system migrations completed successfully!');
        } else {
            console.log('⚠️  Warning: Expected at least 3 forwarding tables, got', result.rows.length);
        }

    } catch (error) {
        await client.query('ROLLBACK;');
        console.error('❌ Migration failed, rolled back');
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigrations().catch(console.error);
