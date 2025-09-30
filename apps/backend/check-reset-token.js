#!/usr/bin/env node

/**
 * Script to check password reset tokens in the database
 * Usage: node check-reset-token.js [email]
 */

const { getPool } = require('./src/db');

async function checkResetToken(email = 'support@virtualaddresshub.co.uk') {
    try {
        const pool = getPool();

        console.log(`🔍 Checking reset tokens for: ${email}`);
        console.log('');

        // Get user's reset token info
        const result = await pool.query(`
            SELECT 
                id, 
                email, 
                first_name,
                reset_token_hash, 
                reset_token_expires_at, 
                reset_token_used_at,
                CASE 
                    WHEN reset_token_expires_at IS NULL THEN 'No token'
                    WHEN reset_token_expires_at < NOW() THEN 'Expired'
                    WHEN reset_token_used_at IS NOT NULL THEN 'Used'
                    ELSE 'Valid'
                END as token_status
            FROM "user" 
            WHERE email = $1
        `, [email]);

        if (result.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = result.rows[0];
        console.log('👤 User Info:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name}`);
        console.log('');

        console.log('🔑 Reset Token Info:');
        console.log(`   Status: ${user.token_status}`);
        console.log(`   Hash: ${user.reset_token_hash ? user.reset_token_hash.substring(0, 20) + '...' : 'None'}`);
        console.log(`   Expires: ${user.reset_token_expires_at || 'Never'}`);
        console.log(`   Used At: ${user.reset_token_used_at || 'Never'}`);
        console.log('');

        // Show recent reset attempts
        const recentResult = await pool.query(`
            SELECT 
                reset_token_hash,
                reset_token_expires_at,
                reset_token_used_at,
                updated_at
            FROM "user" 
            WHERE email = $1 
            AND reset_token_hash IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 5
        `, [email]);

        if (recentResult.rows.length > 0) {
            console.log('📋 Recent Reset Attempts:');
            recentResult.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. Hash: ${row.reset_token_hash.substring(0, 20)}...`);
                console.log(`      Expires: ${row.reset_token_expires_at}`);
                console.log(`      Used: ${row.reset_token_used_at || 'Not used'}`);
                console.log(`      Updated: ${row.updated_at}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the check
const email = process.argv[2] || 'support@virtualaddresshub.co.uk';
checkResetToken(email);
