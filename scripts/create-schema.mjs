#!/usr/bin/env node

/**
 * PostgreSQL Schema Creation Script
 * Creates the complete database schema for Virtual Address Hub
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is required');
    console.error('Example: DATABASE_URL=postgresql://user:pass@localhost:5432/dbname');
    process.exit(1);
}

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
});

async function createSchema() {
    const client = await pool.connect();

    try {
        console.log('🚀 Creating PostgreSQL schema for Virtual Address Hub...');

        // Read the schema file
        const schemaPath = join(__dirname, '..', 'create_postgres_schema.sql');
        const schemaSQL = readFileSync(schemaPath, 'utf8');

        // Execute the schema creation
        console.log('📝 Executing schema creation...');
        await client.query(schemaSQL);

        console.log('✅ Schema created successfully!');

        // Verify tables were created
        console.log('🔍 Verifying tables...');
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('📋 Created tables:');
        result.rows.forEach(row => {
            console.log(`  • ${row.table_name}`);
        });

        // Check if plans were inserted
        const plansResult = await client.query('SELECT COUNT(*) as count FROM plans');
        console.log(`📦 Default plans created: ${plansResult.rows[0].count}`);

        console.log('');
        console.log('🎉 Database setup complete!');
        console.log('Your PostgreSQL database is ready to use with your application.');

    } catch (error) {
        console.error('❌ Error creating schema:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await createSchema();
    } catch (error) {
        console.error('Failed to create schema:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { createSchema };
