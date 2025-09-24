#!/usr/bin/env node
/* eslint-disable no-console */
const BASE_URL = 'https://vah-api-staging.onrender.com/api';

async function createAdminUser(userData) {
    try {
        console.log(`🚀 Creating admin user: ${userData.email}`);

        // First, create the user via signup
        const signupResponse = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userData.email,
                password: userData.password,
                first_name: userData.first_name,
                last_name: userData.last_name
            })
        });

        const signupResult = await signupResponse.json();

        if (signupResponse.ok) {
            console.log(`✅ User created successfully: ${userData.email}`);
            console.log(`   User ID: ${signupResult.data.id}`);

            // Now we need to promote them to admin
            // Since we don't have a direct admin promotion endpoint,
            // we'll need to update the database directly
            console.log(`⚠️  Note: User created but needs to be promoted to admin manually`);
            console.log(`   You'll need to update the database to set is_admin=1 and role='admin'`);

            return { success: true, user: signupResult.data };
        } else if (signupResponse.status === 409) {
            console.log(`ℹ️  User already exists: ${userData.email}`);
            return { success: true, user: { email: userData.email, exists: true } };
        } else {
            console.error(`❌ Failed to create user: ${signupResult.error}`);
            return { success: false, error: signupResult.error };
        }
    } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function testLogin(email, password) {
    try {
        console.log(`🔐 Testing login for: ${email}`);

        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`✅ Login successful!`);
            console.log(`   User: ${result.data.email}`);
            console.log(`   Role: ${result.data.role}`);
            console.log(`   Is Admin: ${result.data.is_admin}`);
            return { success: true, user: result.data };
        } else {
            console.error(`❌ Login failed: ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error(`❌ Login error:`, error.message);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🎯 Creating real admin users via API...');
    console.log('');

    const adminUsers = [
        {
            email: 'ops@virtualaddresshub.co.uk',
            password: 'AdminPass123!',
            first_name: 'Site',
            last_name: 'Admin'
        },
        {
            email: 'admin@virtualaddresshub.co.uk',
            password: 'AdminPass123!',
            first_name: 'System',
            last_name: 'Administrator'
        },
        {
            email: 'worker@virtualaddresshub.co.uk',
            password: 'WorkerPass123!',
            first_name: 'Ops',
            last_name: 'Worker'
        }
    ];

    const results = [];

    for (const user of adminUsers) {
        const result = await createAdminUser(user);
        results.push({ ...user, ...result });
        console.log('');
    }

    console.log('📋 Summary:');
    console.log('');
    results.forEach((user, index) => {
        const status = user.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${user.email} - ${user.success ? 'Created' : 'Failed'}`);
    });

    console.log('');
    console.log('🔐 Testing login with created users...');
    console.log('');

    // Test login with the first admin user
    const testUser = adminUsers[0];
    await testLogin(testUser.email, testUser.password);

    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Check your PostgreSQL database to see the created users');
    console.log('2. Manually update users to admin status:');
    console.log('   UPDATE "user" SET is_admin=1, role=\'admin\' WHERE email=\'ops@virtualaddresshub.co.uk\';');
    console.log('3. Test login with the updated admin credentials');
}

main().catch(console.error);
