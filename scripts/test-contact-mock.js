#!/usr/bin/env node
// Test script to verify MOCK_EMAIL functionality

const http = require('http');

console.log('🧪 Testing contact API with MOCK_EMAIL...\n');

// Test data
const testData = {
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Test Subject',
    message: 'Test message',
    website: '' // honeypot empty
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/contact',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Response: ${data}`);

        if (res.statusCode === 200) {
            const response = JSON.parse(data);
            if (response.ok) {
                console.log('✅ Contact form test passed');
            } else {
                console.log('❌ Contact form test failed - response not ok');
            }
        } else {
            console.log(`❌ Contact form test failed - status ${res.statusCode}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Request failed: ${e.message}`);
});

req.write(postData);
req.end();
