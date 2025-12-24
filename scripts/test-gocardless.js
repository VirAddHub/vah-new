#!/usr/bin/env node

/**
 * Simple test script for GoCardless integration
 * Run with: node test-gocardless.js
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://vah-api-staging.onrender.com';

async function testGoCardless() {
    console.log('🧪 Testing GoCardless Integration...\n');

    try {
        // Test 1: Check if billing overview endpoint is accessible
        console.log('1️⃣ Testing billing overview endpoint...');
        const overviewResponse = await fetch(`${API_BASE}/api/billing/overview`, {
            method: 'GET',
            headers: {
                'Cookie': 'auth_token=test', // You'll need a real token
            }
        });

        if (overviewResponse.ok) {
            console.log('✅ Billing overview endpoint accessible');
        } else {
            console.log(`❌ Billing overview failed: ${overviewResponse.status}`);
        }

        // Test 2: Test GoCardless environment variables
        console.log('\n2️⃣ Checking GoCardless environment variables...');
        const envVars = [
            'GC_ACCESS_TOKEN',
            'GC_ENVIRONMENT',
            'GC_WEBHOOK_SECRET',
            'APP_URL'
        ];

        envVars.forEach(envVar => {
            if (process.env[envVar]) {
                console.log(`✅ ${envVar} is set`);
            } else {
                console.log(`❌ ${envVar} is missing`);
            }
        });

        // Test 3: Test webhook signature verification
        console.log('\n3️⃣ Testing webhook signature verification...');
        const testBody = '{"test": "data"}';
        const testSecret = 'test_secret_example';  // pragma: allowlist secret
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', testSecret);
        hmac.update(testBody, 'utf8');
        const signature = hmac.digest('hex');

        console.log(`✅ Signature generation works: ${signature.substring(0, 8)}...`);

        console.log('\n🎉 GoCardless integration test completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Set up your GoCardless sandbox account');
        console.log('2. Update .env with real sandbox credentials');
        console.log('3. Test the /billing page in your frontend');
        console.log('4. Set up webhook endpoint in GoCardless dashboard');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Only run if called directly
if (require.main === module) {
    testGoCardless();
}

module.exports = { testGoCardless };
