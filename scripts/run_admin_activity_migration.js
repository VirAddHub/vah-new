#!/usr/bin/env node
// Run admin activity tables migration

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://vah_user:Vah2024!@dpg-d1j8j8k2i3mhq7b8qj8g-a.oregon-postgres.render.com/vah_db_7x8k',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Creating admin activity tables...');

        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', '023_create_admin_activity_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await pool.query(migrationSQL);

        console.log('✅ Admin activity tables created successfully');

        // Test the tables
        const result = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM admin_log) as admin_log_count,
                (SELECT COUNT(*) FROM activity_log) as activity_log_count,
                (SELECT COUNT(*) FROM mail_event) as mail_event_count
        `);

        console.log('📊 Table counts:', result.rows[0]);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
