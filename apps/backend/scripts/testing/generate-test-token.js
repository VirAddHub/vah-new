#!/usr/bin/env node

/**
 * Script to generate a test password reset token
 * Usage: node generate-test-token.js [email]
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getPool } = require('./src/db');

async function generateTestToken(email = 'support@virtualaddresshub.co.uk') {
    try {
        const pool = getPool();

        console.log(`🔧 Generating test reset token for: ${email}`);
        console.log('');

        // Generate raw token
        const rawToken = crypto.randomBytes(32).toString('base64url');
        console.log(`🔑 Raw Token: ${rawToken}`);
        console.log('');

        // Hash the token (same as in the reset request)
        const tokenHash = await bcrypt.hash(rawToken, 12);
        console.log(`🔐 Token Hash: ${tokenHash.substring(0, 50)}...`);
        console.log('');

        // Update user with new token
        const result = await pool.query(`
            UPDATE "user"
            SET reset_token_hash = $1,
                reset_token_expires_at = NOW() + INTERVAL '60 minutes',
                reset_token_used_at = NULL
            WHERE email = $2
            RETURNING id, first_name
        `, [tokenHash, email]);

        if (result.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = result.rows[0];
        console.log(`✅ Token generated for user: ${user.first_name} (ID: ${user.id})`);
        console.log('');

        // Show the reset link
        const baseUrl = process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app';
        const resetLink = `${baseUrl}/reset-password/confirm?token=${encodeURIComponent(rawToken)}`;

        console.log('🔗 Reset Link:');
        console.log(resetLink);
        console.log('');

        console.log('🧪 Test Commands:');
        console.log(`curl -X POST ${process.env.API_BASE_URL || 'https://vah-api-staging.onrender.com'}/api/auth/reset-password/confirm \\`); // pragma: allowlist secret
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"token":"${rawToken}","password":"NewPassword123!"}'`); // pragma: allowlist secret
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the generator
const email = process.argv[2] || 'support@virtualaddresshub.co.uk';
generateTestToken(email);
