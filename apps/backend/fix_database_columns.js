const { Pool } = require('pg');

async function fixDatabaseColumns() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false // Required for Render's managed Postgres
        }
    });

    try {
        console.log('Connecting to database...');
        await pool.connect();
        console.log('Database connected.');

        // Check current schema
        console.log('\nChecking current user table schema...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name IN ('deleted_at', 'updated_at', 'created_at', 'forwarding_address')
            ORDER BY column_name
        `);

        console.log('Current columns:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Check if deleted_at exists
        const deletedAtExists = result.rows.some(row => row.column_name === 'deleted_at');
        const forwardingAddressExists = result.rows.some(row => row.column_name === 'forwarding_address');

        console.log(`\ndeleted_at column exists: ${deletedAtExists}`);
        console.log(`forwarding_address column exists: ${forwardingAddressExists}`);

        // Add missing columns
        if (!deletedAtExists) {
            console.log('\nAdding deleted_at column...');
            await pool.query('ALTER TABLE "user" ADD COLUMN deleted_at bigint');
            console.log('✅ deleted_at column added successfully');
        } else {
            console.log('✅ deleted_at column already exists');
        }

        if (!forwardingAddressExists) {
            console.log('\nAdding forwarding_address column...');
            await pool.query('ALTER TABLE "user" ADD COLUMN forwarding_address text');
            console.log('✅ forwarding_address column added successfully');
        } else {
            console.log('✅ forwarding_address column already exists');
        }

        // Verify the changes
        console.log('\nVerifying changes...');
        const verifyResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name IN ('deleted_at', 'forwarding_address')
            ORDER BY column_name
        `);

        console.log('Updated columns:');
        verifyResult.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        console.log('\n✅ Database schema updated successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('Database connection closed.');
    }
}

fixDatabaseColumns();



