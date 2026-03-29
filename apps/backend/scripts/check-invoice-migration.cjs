#!/usr/bin/env node
/**
 * Check if invoice migration (116) was applied successfully
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { getPgSslOption } = require('./lib/pgSsl.cjs');

// Get connection string from environment or use default
const connectionString = process.env.DATABASE_URL || 
  'postgresql://vah_postgres_40zq_user:uTRWGQlKebPeTjsEwvYb6rAw8YMNbLZX@dpg-d3coq7l6ubrc73f0bt3g-a:5432/vah_postgres_40zq?sslmode=require';

(async () => {
    const client = new Client({ 
        connectionString,
        ssl: getPgSslOption()
    });

    try {
        console.log('🔗 Connecting to Render PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!\n');

        // Check if invoices table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'invoices'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('❌ invoices table does not exist');
            process.exit(1);
        }

        console.log('✅ invoices table exists\n');

        // Check for required columns
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'invoices'
            AND column_name IN ('gocardless_payment_id', 'currency', 'period_start', 'period_end', 'pdf_path')
            ORDER BY column_name;
        `);

        console.log('📊 Checking invoice columns:\n');
        
        const requiredColumns = [
            'gocardless_payment_id',
            'currency', 
            'period_start',
            'period_end',
            'pdf_path'
        ];

        const foundColumns = columns.rows.map(r => r.column_name);
        
        requiredColumns.forEach(col => {
            const found = columns.rows.find(r => r.column_name === col);
            if (found) {
                console.log(`   ✅ ${col.padEnd(25)} ${found.data_type.padEnd(15)} nullable: ${found.is_nullable} ${found.column_default ? `default: ${found.column_default}` : ''}`);
            } else {
                console.log(`   ❌ ${col.padEnd(25)} MISSING`);
            }
        });

        // Check indexes
        console.log('\n📑 Checking indexes:\n');
        const indexes = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'invoices'
            AND indexname LIKE '%gocardless%' OR indexname LIKE '%period%'
            ORDER BY indexname;
        `);

        if (indexes.rows.length > 0) {
            indexes.rows.forEach(idx => {
                console.log(`   ✅ ${idx.indexname}`);
            });
        } else {
            console.log('   ⚠️  No indexes found (may need to run migration)');
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        const allFound = requiredColumns.every(col => foundColumns.includes(col));
        
        if (allFound) {
            console.log('✅ Migration 116 appears to be applied successfully!');
            console.log('   All required columns exist.');
        } else {
            console.log('⚠️  Migration 116 may not be fully applied.');
            console.log('   Missing columns:', requiredColumns.filter(col => !foundColumns.includes(col)).join(', '));
            console.log('\n💡 Run the migration SQL in Render Dashboard SQL Editor');
        }

    } catch (error) {
        console.error('\n❌ Check failed:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.error('\n💡 Connection issue. Try using Render Dashboard SQL Editor instead.');
            console.error('   Or update DATABASE_URL environment variable with correct connection string.');
        }
        process.exit(1);
    } finally {
        await client.end();
    }
})();

