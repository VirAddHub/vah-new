#!/usr/bin/env node
// scripts/apply-migration.js - Apply database migrations on Render

const { Pool } = require('pg');

async function applyMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔄 Applying database migration...');

        // Check if deleted_at column exists
        const { rows: columnCheck } = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'user' AND column_name = 'deleted_at'
        `);

        if (columnCheck.length === 0) {
            console.log('📝 Adding deleted_at column to user table...');
            await pool.query('ALTER TABLE "user" ADD COLUMN deleted_at TIMESTAMPTZ');
            console.log('✅ deleted_at column added');
        } else {
            console.log('✅ deleted_at column already exists');
        }

        // Check if admin_audit table exists
        const { rows: tableCheck } = await pool.query(`
            SELECT to_regclass('public.admin_audit') as exists
        `);

        if (!tableCheck[0].exists) {
            console.log('📝 Creating admin_audit table...');
            await pool.query(`
                CREATE TABLE admin_audit (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER NOT NULL REFERENCES "user"(id),
                    action VARCHAR(100) NOT NULL,
                    target_user_id INTEGER REFERENCES "user"(id),
                    meta JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            console.log('✅ admin_audit table created');
        } else {
            console.log('✅ admin_audit table already exists');
        }

        // Create indexes
        console.log('📝 Creating indexes...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON "user"(deleted_at)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit(action)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at)');
        
        // Create unique index for active emails only
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email_active
            ON "user" (LOWER(email))
            WHERE deleted_at IS NULL
        `);
        
        console.log('✅ Indexes created');

        console.log('🎉 Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    applyMigration();
}

module.exports = { applyMigration };
