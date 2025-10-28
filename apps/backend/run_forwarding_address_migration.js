const { Pool } = require('pg');

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔄 Adding forwarding_address column to user table...');

        await pool.query(`
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS forwarding_address TEXT;
        `);

        console.log('✅ Successfully added forwarding_address column');

        // Verify the column exists
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user' AND column_name = 'forwarding_address';
        `);

        if (result.rows.length > 0) {
            console.log('✅ Column verified:', result.rows[0]);
        } else {
            console.log('❌ Column not found after migration');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();





