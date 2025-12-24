#!/usr/bin/env node

/**
 * Script to remove the old "Digital Mailbox Plan" from the database
 * Run with: node remove_old_plan.js
 */

const { Client } = require('pg');

async function removeOldPlan() {
    // You'll need to set your DATABASE_URL environment variable
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable is not set.');
        console.log('Please set it like: export DATABASE_URL="your_connection_string"');
        process.exit(1);
    }

    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // First, check if the plan exists
        const checkResult = await client.query(`
      SELECT id, name, slug, active, retired_at 
      FROM plans 
      WHERE slug = 'digital_mailbox' AND name = 'Digital Mailbox Plan'
    `);

        if (checkResult.rows.length === 0) {
            console.log('ℹ️  Plan not found - it may have already been removed');
            return;
        }

        const plan = checkResult.rows[0];
        console.log(`📋 Found plan: ${plan.name} (ID: ${plan.id}, Active: ${plan.active})`);

        // Delete the plan
        const deleteResult = await client.query(`
      DELETE FROM plans 
      WHERE slug = 'digital_mailbox' AND name = 'Digital Mailbox Plan'
    `);

        console.log(`✅ Successfully removed the old "Digital Mailbox Plan"`);
        console.log(`📊 Rows affected: ${deleteResult.rowCount}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Only run if called directly
if (require.main === module) {
    removeOldPlan();
}

module.exports = { removeOldPlan };
