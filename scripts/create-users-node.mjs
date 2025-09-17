#!/usr/bin/env node
/**
 * Node.js script for creating admin and worker users in PostgreSQL
 * This script uses environment variables for secure password management
 */

import { Client } from 'pg';
import crypto from 'crypto';
import readline from 'readline';

// Configuration
const config = {
    adminEmail: 'ops@virtualaddresshub.co.uk',
    workerEmail: 'worker@virtualaddresshub.co.uk',
    adminPassword: process.env.ADMIN_PASSWORD,
    workerPassword: process.env.WORKER_PASSWORD,
    databaseUrl: process.env.DATABASE_URL
};

// Validate configuration
function validateConfig() {
    const errors = [];

    if (!config.databaseUrl) {
        errors.push('DATABASE_URL environment variable is required');
    }

    if (!config.adminPassword) {
        errors.push('ADMIN_PASSWORD environment variable is required');
    }

    if (!config.workerPassword) {
        errors.push('WORKER_PASSWORD environment variable is required');
    }

    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nExample usage:');
        console.error('  export DATABASE_URL="postgresql://user:pass@host:port/dbname?sslmode=require"');
        console.error('  export ADMIN_PASSWORD="YourStrongAdminPassword123!"');
        console.error('  export WORKER_PASSWORD="YourStrongWorkerPassword123!"');
        console.error('  node scripts/create-users-node.mjs');
        process.exit(1);
    }
}

// Password strength validation
function validatePassword(password, label) {
    const errors = [];

    if (password.length < 12) {
        errors.push('at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('at least one special character');
    }

    if (errors.length > 0) {
        console.error(`❌ ${label} password is not strong enough. It needs:`);
        errors.forEach(error => console.error(`  - ${error}`));
        return false;
    }

    return true;
}

// Hash password using bcrypt (same as the database crypt function)
async function hashPassword(password) {
    const bcrypt = await import('bcrypt');
    return await bcrypt.hash(password, 12);
}

// Create user in database
async function createUser(client, userData) {
    const { email, password, firstName, lastName, role, isAdmin } = userData;

    const hashedPassword = await hashPassword(password);
    const now = Math.floor(Date.now());

    const query = `
    INSERT INTO "user" (
      email, password, first_name, last_name, role, is_admin, 
      status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (email) 
    DO UPDATE SET
      password = EXCLUDED.password,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      is_admin = EXCLUDED.is_admin,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
    RETURNING id, email, first_name, last_name, role, is_admin, status, created_at, updated_at
  `;

    const values = [
        email,
        hashedPassword,
        firstName,
        lastName,
        role,
        isAdmin,
        'active',
        now,
        now
    ];

    const result = await client.query(query, values);
    return result.rows[0];
}

// Verify user creation
async function verifyUser(client, email) {
    const query = `
    SELECT id, email, first_name, last_name, role, is_admin, status, 
           CASE WHEN password IS NOT NULL THEN 'Password set' ELSE 'No password' END as password_status,
           to_timestamp(created_at/1000) as created_at_readable,
           to_timestamp(updated_at/1000) as updated_at_readable
    FROM "user"
    WHERE email = $1
  `;

    const result = await client.query(query, [email]);
    return result.rows[0];
}

// Main function
async function main() {
    console.log('=== User Creation Script ===\n');

    // Validate configuration
    validateConfig();

    // Validate passwords
    if (!validatePassword(config.adminPassword, 'Admin')) {
        process.exit(1);
    }

    if (!validatePassword(config.workerPassword, 'Worker')) {
        process.exit(1);
    }

    console.log('✅ Configuration validated');
    console.log(`📧 Admin email: ${config.adminEmail}`);
    console.log(`📧 Worker email: ${config.workerEmail}`);
    console.log(`🗄️  Database: ${config.databaseUrl.replace(/:[^:]*@/, ':***@')}\n`);

    const client = new Client({
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Create admin user
        console.log('\n👤 Creating admin user...');
        const adminUser = await createUser(client, {
            email: config.adminEmail,
            password: config.adminPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            isAdmin: true
        });

        console.log('✅ Admin user created/updated');

        // Create worker user
        console.log('\n👤 Creating worker user...');
        const workerUser = await createUser(client, {
            email: config.workerEmail,
            password: config.workerPassword,
            firstName: 'Worker',
            lastName: 'User',
            role: 'worker',
            isAdmin: false
        });

        console.log('✅ Worker user created/updated');

        // Verify both users
        console.log('\n🔍 Verifying users...');
        const adminVerification = await verifyUser(client, config.adminEmail);
        const workerVerification = await verifyUser(client, config.workerEmail);

        console.log('\n=== Admin User ===');
        console.log(`ID: ${adminVerification.id}`);
        console.log(`Email: ${adminVerification.email}`);
        console.log(`Name: ${adminVerification.first_name} ${adminVerification.last_name}`);
        console.log(`Role: ${adminVerification.role}`);
        console.log(`Admin: ${adminVerification.is_admin}`);
        console.log(`Status: ${adminVerification.status}`);
        console.log(`Password: ${adminVerification.password_status}`);
        console.log(`Created: ${adminVerification.created_at_readable}`);
        console.log(`Updated: ${adminVerification.updated_at_readable}`);

        console.log('\n=== Worker User ===');
        console.log(`ID: ${workerVerification.id}`);
        console.log(`Email: ${workerVerification.email}`);
        console.log(`Name: ${workerVerification.first_name} ${workerVerification.last_name}`);
        console.log(`Role: ${workerVerification.role}`);
        console.log(`Admin: ${workerVerification.is_admin}`);
        console.log(`Status: ${workerVerification.status}`);
        console.log(`Password: ${workerVerification.password_status}`);
        console.log(`Created: ${workerVerification.created_at_readable}`);
        console.log(`Updated: ${workerVerification.updated_at_readable}`);

        console.log('\n=== Summary ===');
        console.log('✅ Both users created/updated successfully');
        console.log('✅ Passwords hashed with bcrypt');
        console.log('✅ Users verified in database');
        console.log('\nNext steps:');
        console.log('1. Test login with both accounts');
        console.log('2. Remove password environment variables from Render');
        console.log('3. Update any hardcoded credentials in your codebase');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Run the script
main().catch(console.error);