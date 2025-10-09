#!/usr/bin/env node
// Test script for enhanced forwarding system
// Usage: node test-forwarding.js

const { createForwardingRequest } = require('./src/modules/forwarding/forwarding.service');
const { drainForwardingOutbox } = require('./src/modules/forwarding/outbox.worker');

async function testForwardingSystem() {
    console.log('🧪 Testing Enhanced Forwarding System...\n');

    try {
        // Test 1: Create forwarding request
        console.log('1️⃣ Testing forwarding request creation...');
        const result = await createForwardingRequest({
            userId: 1,
            mailItemId: 1,
            to: {
                name: 'John Smith',
                address1: '123 Test Street',
                address2: 'Apt 4B',
                city: 'London',
                state: 'England',
                postal: 'SW1A 1AA',
                country: 'GB',
            },
            reason: 'Test forwarding',
            method: 'standard',
        });
        console.log('✅ Forwarding request created:', result);

        // Test 2: Test outbox draining
        console.log('\n2️⃣ Testing outbox draining...');
        await drainForwardingOutbox(10);
        console.log('✅ Outbox drained successfully');

        console.log('\n🎉 All tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testForwardingSystem();
}

