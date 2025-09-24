#!/usr/bin/env node
/* eslint-disable no-console */
const { Client } = require('pg');

async function queryAdminAccounts() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.log('❌ DATABASE_URL environment variable not set.');
        console.log('');
        console.log('Usage:');
        console.log('  DATABASE_URL="postgresql://user:pass@host:port/dbname" node scripts/query-admin-accounts.cjs');
        console.log('');
        console.log('Or set it in your environment:');
        console.log('  export DATABASE_URL="postgresql://user:pass@host:port/dbname"');
        console.log('  node scripts/query-admin-accounts.cjs');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('🔗 Connected to PostgreSQL database');
        console.log('');

        // Query all admin accounts
        const result = await client.query(`
            SELECT 
                id,
                email,
                first_name,
                last_name,
                role,
                is_admin,
                status,
                created_at,
                updated_at,
                CASE 
                    WHEN created_at IS NOT NULL 
                    THEN to_timestamp(created_at/1000)::timestamp 
                    ELSE NULL 
                END as created_at_readable,
                CASE 
                    WHEN updated_at IS NOT NULL 
                    THEN to_timestamp(updated_at/1000)::timestamp 
                    ELSE NULL 
                END as updated_at_readable
            FROM "user" 
            WHERE is_admin = true OR role = 'admin'
            ORDER BY created_at DESC
        `);

        if (result.rows.length === 0) {
            console.log('📭 No admin accounts found in the database.');
            console.log('');
            console.log('To create admin accounts, run:');
            console.log('  node scripts/create-admin-users.cjs');
            return;
        }

        console.log(`👑 Found ${result.rows.length} admin account(s):`);
        console.log('');

        result.rows.forEach((user, index) => {
            console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Is Admin: ${user.is_admin}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Created: ${user.created_at_readable || 'Unknown'}`);
            console.log(`   Updated: ${user.updated_at_readable || 'Unknown'}`);
            console.log('');
        });

        // Also show all users for context
        const allUsersResult = await client.query(`
            SELECT 
                email,
                first_name,
                last_name,
                role,
                is_admin,
                status
            FROM "user" 
            ORDER BY is_admin DESC, role, email
        `);

        console.log('📊 All users in database:');
        console.log('');
        allUsersResult.rows.forEach((user, index) => {
            const adminBadge = user.is_admin ? '👑' : '';
            const roleBadge = user.role === 'admin' ? '🔧' : user.role === 'worker' ? '👷' : '👤';
            console.log(`${index + 1}. ${adminBadge}${roleBadge} ${user.first_name} ${user.last_name} (${user.email}) - ${user.role} - ${user.status}`);
        });

    } catch (error) {
        console.error('❌ Database error:', error.message);
        console.error('');
        console.error('Common issues:');
        console.error('1. Check your DATABASE_URL format');
        console.error('2. Ensure the database is accessible');
        console.error('3. Verify the "user" table exists');
        process.exit(1);
    } finally {
        await client.end();
    }
}

queryAdminAccounts().catch(console.error);
