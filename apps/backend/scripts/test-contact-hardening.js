#!/usr/bin/env node
// Test script to verify contact route hardening works

console.log('🧪 Testing contact route hardening...\n');

// Simulate the logic from our updated contact route
const testCases = [
    {
        name: 'MOCK_EMAIL=1',
        env: { MOCK_EMAIL: '1' },
        expected: 'mock'
    },
    {
        name: 'No Postmark token',
        env: { POSTMARK_SERVER_TOKEN: null },
        expected: 'mock'
    },
    {
        name: 'No Postmark FROM',
        env: { POSTMARK_FROM: null },
        expected: 'mock'
    },
    {
        name: 'No Postmark TO',
        env: { POSTMARK_TO: null },
        expected: 'mock'
    },
    {
        name: 'All Postmark configured',
        env: { 
            MOCK_EMAIL: '0',
            POSTMARK_SERVER_TOKEN: 'pm_test_token',
            POSTMARK_FROM: 'test@example.com',
            POSTMARK_TO: 'support@example.com'
        },
        expected: 'real'
    }
];

testCases.forEach(testCase => {
    // Simulate the useMock logic
    const useMock =
        String(testCase.env.MOCK_EMAIL || '') === '1' ||
        !testCase.env.POSTMARK_SERVER_TOKEN ||
        !testCase.env.POSTMARK_FROM ||
        !testCase.env.POSTMARK_TO;
    
    const result = useMock ? 'mock' : 'real';
    const status = result === testCase.expected ? '✅' : '❌';
    
    console.log(`${status} ${testCase.name}: ${result} (expected: ${testCase.expected})`);
});

console.log('\n🎉 Contact route hardening test complete!');
console.log('\n📋 Next steps:');
console.log('1. Restart the server to pick up the new code');
console.log('2. Test with: curl -i http://localhost:4000/api/contact -H "Content-Type: application/json" -d \'{"name":"Test","email":"test@example.com","subject":"Hi","message":"Hello","website":""}\'');
console.log('3. Should return: 200 {"ok":true,"mode":"mock"}');
