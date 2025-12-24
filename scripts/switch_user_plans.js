#!/usr/bin/env node

/**
 * Script to switch users between plans
 * Usage: node switch_user_plans.js
 */

const { Client } = require('pg');

async function switchUserPlans() {
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

        // Show current plans
        console.log('\n📋 Available Plans:');
        const plans = await client.query('SELECT id, name, price_pence, interval FROM plans WHERE active = true ORDER BY id');
        plans.rows.forEach(plan => {
            console.log(`  ${plan.id}: ${plan.name} - £${(plan.price_pence / 100).toFixed(2)}/${plan.interval}`);
        });

        // Show current users and their plans
        console.log('\n👥 Current Users and Plans:');
        const users = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, p.name as plan_name, p.price_pence, p.interval
      FROM "user" u 
      LEFT JOIN plans p ON u.plan_id = p.id 
      WHERE u.deleted_at IS NULL
      ORDER BY u.id
    `);

        users.rows.forEach(user => {
            const planInfo = user.plan_name ? `${user.plan_name} (£${(user.price_pence / 100).toFixed(2)}/${user.interval})` : 'No Plan';
            console.log(`  User ${user.id}: ${user.email} (${user.first_name} ${user.last_name}) - ${planInfo}`);
        });

        console.log('\n🔄 To switch a user\'s plan, run:');
        console.log('node switch_user_plans.js --user-id=USER_ID --plan-id=PLAN_ID');
        console.log('\nExample:');
        console.log('node switch_user_plans.js --user-id=5 --plan-id=2  # Switch user 5 to annual plan');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Handle command line arguments
if (process.argv.includes('--user-id') && process.argv.includes('--plan-id')) {
    const userId = process.argv.find(arg => arg.startsWith('--user-id='))?.split('=')[1];
    const planId = process.argv.find(arg => arg.startsWith('--plan-id='))?.split('=')[1];

    if (userId && planId) {
        switchUserPlan(userId, planId);
    } else {
        console.error('❌ Please provide both --user-id and --plan-id');
    }
} else {
    switchUserPlans();
}

async function switchUserPlan(userId, planId) {
    const databaseUrl = process.env.DATABASE_URL;
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Verify plan exists
        const planCheck = await client.query('SELECT id, name FROM plans WHERE id = $1 AND active = true', [planId]);
        if (planCheck.rows.length === 0) {
            console.error(`❌ Plan ID ${planId} not found or not active`);
            return;
        }

        // Verify user exists
        const userCheck = await client.query('SELECT id, email FROM "user" WHERE id = $1 AND deleted_at IS NULL', [userId]);
        if (userCheck.rows.length === 0) {
            console.error(`❌ User ID ${userId} not found or deleted`);
            return;
        }

        // Update user's plan
        const result = await client.query(
            'UPDATE "user" SET plan_id = $1, updated_at = $2 WHERE id = $3 RETURNING *',
            [planId, Date.now(), userId]
        );

        console.log(`✅ Successfully changed user ${userId} (${userCheck.rows[0].email}) billing frequency to: ${planCheck.rows[0].name}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

module.exports = { switchUserPlans, switchUserPlan };
