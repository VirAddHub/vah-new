#!/usr/bin/env node

/**
 * Create support user directly in PostgreSQL database
 * Run this script on the Render server with DATABASE_URL environment variable
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Database connection from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createSupportUser() {
    const client = await pool.connect();

    try {
        console.log('🚀 Creating support user in PostgreSQL database...');

        const userData = {
            email: 'support@virtualaddresshub.co.uk',
            password: process.env.SUPPORT_USER_PASSWORD || 'Support123!', // pragma: allowlist secret
            first_name: 'Support',
            last_name: 'Team',
            company_name: 'Virtual Address Hub',
            is_admin: false,
            role: 'user'
        };

        console.log(`📝 Creating user: ${userData.email}`);

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);

        // Create user
        const now = Date.now();
        const name = `${userData.first_name} ${userData.last_name}`.trim();

        const result = await client.query(`
            INSERT INTO "user" (
                email, password, first_name, last_name, name, company_name,
                is_admin, role, status, kyc_status, plan_status,
                plan_start_date, onboarding_step, email_verified, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                name = EXCLUDED.name,
                company_name = EXCLUDED.company_name,
                updated_at = EXCLUDED.updated_at
            RETURNING id, email, first_name, last_name, role, is_admin, status, company_name
        `, [
            userData.email,
            passwordHash,
            userData.first_name,
            userData.last_name,
            name,
            userData.company_name,
            userData.is_admin,
            userData.role,
            'active',
            'verified',
            'active',
            now,
            'completed',
            true,
            now,
            now
        ]);

        const createdUser = result.rows[0];
        console.log(`✅ Support user created/updated successfully!`);
        console.log(`   Email: ${createdUser.email}`);
        console.log(`   ID: ${createdUser.id}`);
        console.log(`   Name: ${createdUser.first_name} ${createdUser.last_name}`);
        console.log(`   Company: ${createdUser.company_name}`);
        console.log(`   Role: ${createdUser.role}`);
        console.log(`   Is Admin: ${createdUser.is_admin}`);
        console.log(`   Status: ${createdUser.status}`);
        console.log(`   Password: ${userData.password}`);

        return { success: true, user: createdUser };

    } catch (error) {
        console.error('❌ Error creating support user:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run the function
createSupportUser()
    .then(result => {
        console.log('\n🎉 Support user creation completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Support user creation failed:', error.message);
        process.exit(1);
    })
    .finally(() => {
        pool.end();
    });
