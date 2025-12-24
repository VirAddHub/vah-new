// Test script to verify frontend login functionality
const { AuthAPI } = require('./apps/frontend/lib/api-client.ts');

async function testLogin() {
    try {
        console.log('🧪 Testing frontend login...');

        // Test with invalid credentials first
        try {
            await AuthAPI.login('test@example.com', 'wrongpassword');
            console.log('❌ Should have failed with invalid credentials');
        } catch (error) {
            console.log('✅ Correctly rejected invalid credentials:', error.message);
        }

        // Test with valid credentials (if we had them)
        // await AuthAPI.login('admin@virtualaddresshub.co.uk', 'AdminPass123!');

        console.log('🎉 Frontend login test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testLogin();
