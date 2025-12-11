#!/usr/bin/env node
/**
 * Run invoice migration (116_add_invoice_columns.sql) on Render PostgreSQL
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Get connection string from environment or use default
const connectionString = process.env.DATABASE_URL || 
  'postgresql://vah_postgres_40zq_user:uTRWGQlKebPeTjsEwvYb6rAw8YMNbLZX@dpg-d3coq7l6ubrc73f0bt3g-a:5432/vah_postgres_40zq?sslmode=require';

(async () => {
    const client = new Client({ 
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to Render PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!');

        // Read and run the migration
        const migrationPath = path.join(__dirname, 'migrations-pg', '116_add_invoice_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('\n📝 Running invoice migration (116_add_invoice_columns.sql)...');
        await client.query(migrationSQL);
        console.log('✅ Migration completed successfully!');

        // Verify columns were added
        console.log('\n🔍 Verifying invoice columns...');
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'invoices'
            AND column_name IN ('gocardless_payment_id', 'currency', 'period_start', 'period_end', 'pdf_path')
            ORDER BY column_name;
        `);

        console.log('\n📊 Invoice columns:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.column_name} (${row.data_type})`);
        });

        if (result.rows.length >= 4) {
            console.log('\n✅ All required columns exist!');
        } else {
            console.log('\n⚠️  Some columns may be missing. Check the output above.');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\n💡 Alternative: Run the SQL manually in Render Dashboard SQL Editor');
        process.exit(1);
    } finally {
        await client.end();
    }
})();

