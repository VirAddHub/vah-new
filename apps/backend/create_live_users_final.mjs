#!/usr/bin/env node

/**
 * Create live users for production - Final working version
 * This script creates users directly in the PostgreSQL database
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// You need to set this with your actual database password from Render
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('Get your database password from Render dashboard and set:');
    console.error('export DATABASE_URL="postgresql://vah_postgres_user:[PASSWORD]@dpg-d2vikgnfte5s73c5nv80-a:5432/vah_postgres"');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createLiveUsers() {
    const client = await pool.connect();

    try {
        console.log('🚀 Creating live users for production...');

        // Users to create
        const users = [
            {
                email: 'admin@virtualaddresshub.co.uk',
                password: 'AdminPass123!',
                first_name: 'Admin',
                last_name: 'User',
                is_admin: true,
                role: 'admin'
            },
            {
                email: 'user@virtualaddresshub.co.uk',
                password: 'UserPass123!',
                first_name: 'Regular',
                last_name: 'User',
                is_admin: false,
                role: 'user'
            }
        ];

        for (const userData of users) {
            console.log(`\n📝 Creating user: ${userData.email}`);

            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            // Create user
            const now = Date.now();
            const name = `${userData.first_name} ${userData.last_name}`.trim();

            try {
                const result = await client.query(`
                    INSERT INTO "user" (
                        email, password, first_name, last_name, name,
                        is_admin, role, status, kyc_status, plan_status,
                        plan_start_date, onboarding_step, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (email) DO UPDATE SET
                        is_admin = EXCLUDED.is_admin,
                        role = EXCLUDED.role,
                        status = EXCLUDED.status,
                        password = EXCLUDED.password,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id, email, first_name, last_name, role, is_admin, status
                `, [
                    userData.email,
                    passwordHash,
                    userData.first_name,
                    userData.last_name,
                    name,
                    userData.is_admin,
                    userData.role,
                    'active',
                    'verified',
                    'active',
                    now,
                    'completed',
                    now,
                    now
                ]);

                const createdUser = result.rows[0];
                console.log(`✅ User created/updated: ${createdUser.email}`);
                console.log(`   ID: ${createdUser.id}`);
                console.log(`   Role: ${createdUser.role}`);
                console.log(`   Is Admin: ${createdUser.is_admin}`);
                console.log(`   Password: ${userData.password}`);

            } catch (error) {
                console.error(`❌ Error creating user ${userData.email}:`, error.message);
            }
        }

        console.log('\n🎉 User creation completed!');
        console.log('\n📋 Login Credentials:');
        console.log('Admin User:');
        console.log('  Email: admin@virtualaddresshub.co.uk');
        console.log('  Password: AdminPass123!');
        console.log('\nRegular User:');
        console.log('  Email: user@virtualaddresshub.co.uk');
        console.log('  Password: UserPass123!');

        // Test login
        console.log('\n🔐 Testing login...');
        await testLogin('admin@virtualaddresshub.co.uk', 'AdminPass123!');
        await testLogin('user@virtualaddresshub.co.uk', 'UserPass123!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

async function testLogin(email, password) {
    try {
        const response = await fetch('https://vah-api-staging.onrender.com/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ Login successful for ${email}`);
            console.log(`   User ID: ${data.data.id}`);
            console.log(`   Role: ${data.data.role}`);
            console.log(`   Is Admin: ${data.data.is_admin}`);
        } else {
            console.log(`❌ Login failed for ${email}: ${data.error}`);
        }
    } catch (error) {
        console.log(`❌ Login error for ${email}: ${error.message}`);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createLiveUsers().catch(console.error);
}

export { createLiveUsers };
