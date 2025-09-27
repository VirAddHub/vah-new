#!/usr/bin/env node
// Test script to verify contact route environment variable handling

console.log('🧪 Testing contact route environment variable handling...\n');

// Simulate the environment variable logic
const testCases = [
    {
        name: 'Mock mode (MOCK_EMAIL=1)',
        env: { MOCK_EMAIL: '1' },
        expected: 'mock'
    },
    {
        name: 'Missing POSTMARK_TOKEN',
        env: { 
            MOCK_EMAIL: '0',
            POSTMARK_FROM: 'test@example.com',
            POSTMARK_TO: 'support@example.com'
        },
        expected: 'misconfigured'
    },
    {
        name: 'Missing POSTMARK_FROM',
        env: { 
            MOCK_EMAIL: '0',
            POSTMARK_TOKEN: 'pm_test_token',
            POSTMARK_TO: 'support@example.com'
        },
        expected: 'misconfigured'
    },
    {
        name: 'Missing POSTMARK_TO',
        env: { 
            MOCK_EMAIL: '0',
            POSTMARK_TOKEN: 'pm_test_token',
            POSTMARK_FROM: 'test@example.com'
        },
        expected: 'misconfigured'
    },
    {
        name: 'All configured (real mode)',
        env: { 
            MOCK_EMAIL: '0',
            POSTMARK_TOKEN: 'pm_test_token',
            POSTMARK_FROM: 'test@example.com',
            POSTMARK_TO: 'support@example.com'
        },
        expected: 'real'
    }
];

testCases.forEach(testCase => {
    // Simulate the environment variable extraction
    const POSTMARK_TOKEN = testCase.env.POSTMARK_TOKEN || testCase.env.POSTMARK_SERVER_TOKEN;
    const POSTMARK_FROM = testCase.env.POSTMARK_FROM;
    const POSTMARK_TO = testCase.env.POSTMARK_TO;
    const MOCK_EMAIL = testCase.env.MOCK_EMAIL === '1';
    
    let result;
    if (MOCK_EMAIL) {
        result = 'mock';
    } else if (!POSTMARK_TOKEN || !POSTMARK_FROM || !POSTMARK_TO) {
        result = 'misconfigured';
    } else {
        result = 'real';
    }
    
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`${status} ${testCase.name}: ${result} (expected: ${testCase.expected})`);
});

console.log('\n🎉 Environment variable handling test complete!');
console.log('\n📋 Testing Instructions:');
console.log('1. Set environment variables:');
console.log('   $env:POSTMARK_TOKEN="pm_your_token"');
console.log('   $env:POSTMARK_FROM="support@virtualaddresshub.co.uk"');
console.log('   $env:POSTMARK_TO="support@virtualaddresshub.co.uk"');
console.log('   $env:MOCK_EMAIL="0"');
console.log('2. Restart server: npm run dev:backend');
console.log('3. Test: curl -i http://localhost:4000/api/contact -H "Content-Type: application/json" -d \'{"name":"Test","email":"test@example.com","subject":"Hi","message":"Hello","website":""}\'');
console.log('4. Expected: 200 {"ok":true} or 500 with missing fields');
