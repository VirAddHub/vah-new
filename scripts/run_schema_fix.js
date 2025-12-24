#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSchemaFix() {
    console.log('🔧 Running schema fix migration...');

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

        // Read and run the migration
        const migrationPath = path.join(__dirname, 'migrations', '20251007_fix_missing_schema.sql');

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            throw new Error(`Migration file not found: 20251007_fix_missing_schema.sql`);
        }

        console.log('📋 Running schema fix migration...');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN;');
        await client.query(sql);
        await client.query('COMMIT;');

        console.log('✅ Schema fix migration completed successfully');

        // Verify tables were created
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('support_ticket', 'forwarding_request', 'mail_item')
            ORDER BY table_name
        `);

        console.log('📊 Verified tables:', result.rows.map(r => r.table_name));

        // Check if support_ticket table has the right columns
        const supportColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'support_ticket'
            ORDER BY column_name
        `);

        console.log('📊 support_ticket columns:', supportColumns.rows.map(r => r.column_name));

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await client.query('ROLLBACK;');
        process.exit(1);
    } finally {
        await client.end();
    }
}

runSchemaFix().catch(console.error);
