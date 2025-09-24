#!/usr/bin/env node
/* eslint-disable no-console */
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createRealAdminUsers() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.log('❌ DATABASE_URL environment variable not set.');
        console.log('');
        console.log('Usage:');
        console.log('  DATABASE_URL="postgresql://user:pass@host:port/dbname" node scripts/create-real-admin-users.cjs');
        console.log('');
        console.log('Or set it in your environment:');
        console.log('  export DATABASE_URL="postgresql://user:pass@host:port/dbname"');
        console.log('  node scripts/create-real-admin-users.cjs');
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

        const adminUsers = [
            {
                email: 'ops@virtualaddresshub.co.uk',
                password: 'AdminPass123!',
                first_name: 'Site',
                last_name: 'Admin',
                role: 'admin',
                is_admin: true
            },
            {
                email: 'admin@virtualaddresshub.co.uk',
                password: 'AdminPass123!',
                first_name: 'System',
                last_name: 'Administrator',
                role: 'admin',
                is_admin: true
            },
            {
                email: 'worker@virtualaddresshub.co.uk',
                password: 'WorkerPass123!',
                first_name: 'Ops',
                last_name: 'Worker',
                role: 'worker',
                is_admin: false
            }
        ];

        for (const user of adminUsers) {
            console.log(`🚀 Creating user: ${user.email}`);

            // Hash password
            const saltRounds = 12;
            const passwordHash = bcrypt.hashSync(user.password, saltRounds);

            // Create user with proper admin fields
            const now = Date.now();
            const name = `${user.first_name} ${user.last_name}`.trim();

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
                        updated_at = EXCLUDED.updated_at
                    RETURNING id, email, first_name, last_name, role, is_admin, status
                `, [
                    user.email,
                    passwordHash,
                    user.first_name,
                    user.last_name,
                    name,
                    user.is_admin,
                    user.role,
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
                console.log('');

            } catch (error) {
                console.error(`❌ Error creating user ${user.email}:`, error.message);
            }
        }

        // Verify all users were created
        console.log('📋 Verifying created users:');
        const verifyResult = await client.query(`
            SELECT id, email, first_name, last_name, role, is_admin, status, created_at
            FROM "user" 
            WHERE email IN ($1, $2, $3)
            ORDER BY email
        `, [
            'ops@virtualaddresshub.co.uk',
            'admin@virtualaddresshub.co.uk',
            'worker@virtualaddresshub.co.uk'
        ]);

        verifyResult.rows.forEach((user, index) => {
            const adminBadge = user.is_admin ? '👑' : '👤';
            const roleBadge = user.role === 'admin' ? '🔧' : user.role === 'worker' ? '👷' : '👤';
            console.log(`${index + 1}. ${adminBadge}${roleBadge} ${user.first_name} ${user.last_name} (${user.email})`);
            console.log(`   Role: ${user.role}, Is Admin: ${user.is_admin}, Status: ${user.status}`);
        });

        console.log('');
        console.log('🎉 Real admin users created successfully!');
        console.log('');
        console.log('🔐 Test login with:');
        console.log('  Email: ops@virtualaddresshub.co.uk');
        console.log('  Password: AdminPass123!');
        console.log('');
        console.log('  Email: admin@virtualaddresshub.co.uk');
        console.log('  Password: AdminPass123!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createRealAdminUsers().catch(console.error);
