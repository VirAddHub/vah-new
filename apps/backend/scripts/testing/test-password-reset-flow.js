#!/usr/bin/env node

/**
 * Test script for password reset flow
 * Usage: node test-password-reset-flow.js [baseUrl]
 * 
 * This script tests the complete password reset flow:
 * 1. Request password reset
 * 2. Extract token from database (for testing)
 * 3. Confirm password reset
 * 4. Test login with new password
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'https://vah-api-staging.onrender.com'; // pragma: allowlist secret
const TEST_EMAIL = 'support@virtualaddresshub.co.uk';
const NEW_PASSWORD = 'NewPassword123!'; // pragma: allowlist secret

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;

        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

// Helper function to get token from database (for testing)
async function getResetTokenFromDB() {
    console.log('🔍 Getting reset token from database...');

    try {
        // This would need to be implemented as a separate endpoint for testing
        // For now, we'll simulate this step
        console.log('⚠️  Note: In production, you would need to check the database directly or create a test endpoint');
        console.log('   SQL: SELECT reset_token_hash, reset_token_expires_at FROM "user" WHERE email = $1');
        return null;
    } catch (error) {
        console.error('❌ Error getting token from DB:', error.message);
        return null;
    }
}

async function testPasswordResetFlow() {
    console.log('🚀 Starting password reset flow test...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`📧 Test Email: ${TEST_EMAIL}`);
    console.log('');

    try {
        // Step 1: Request password reset
        console.log('1️⃣ Requesting password reset...');
        const resetRequest = await makeRequest(`${BASE_URL}/api/profile/reset-password-request`, {
            method: 'POST',
            body: { email: TEST_EMAIL }
        });

        console.log(`   Status: ${resetRequest.status}`);
        console.log(`   Response:`, resetRequest.data);

        if (resetRequest.status !== 200) {
            throw new Error(`Reset request failed with status ${resetRequest.status}`);
        }
        console.log('✅ Password reset request successful');
        console.log('');

        // Step 2: Get token from database (for testing)
        console.log('2️⃣ Getting reset token from database...');
        const token = await getResetTokenFromDB();

        if (!token) {
            console.log('⚠️  Skipping token validation - would need database access');
            console.log('   To test manually:');
            console.log('   1. Check your email for the reset link');
            console.log('   2. Extract the token from the URL');
            console.log('   3. Use the token in the confirm step');
            console.log('');
            return;
        }

        // Step 3: Confirm password reset
        console.log('3️⃣ Confirming password reset...');
        const confirmRequest = await makeRequest(`${BASE_URL}/api/auth/reset-password/confirm`, {
            method: 'POST',
            body: {
                token: token,
                password: NEW_PASSWORD
            }
        });

        console.log(`   Status: ${confirmRequest.status}`);
        console.log(`   Response:`, confirmRequest.data);

        if (confirmRequest.status !== 200) {
            throw new Error(`Password reset confirmation failed with status ${confirmRequest.status}`);
        }
        console.log('✅ Password reset confirmation successful');
        console.log('');

        // Step 4: Test login with new password
        console.log('4️⃣ Testing login with new password...');
        const loginRequest = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: {
                email: TEST_EMAIL,
                password: NEW_PASSWORD
            }
        });

        console.log(`   Status: ${loginRequest.status}`);
        console.log(`   Response:`, loginRequest.data);

        if (loginRequest.status !== 200) {
            throw new Error(`Login failed with status ${loginRequest.status}`);
        }
        console.log('✅ Login with new password successful');
        console.log('');

        console.log('🎉 Password reset flow test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testPasswordResetFlow().catch(console.error);
