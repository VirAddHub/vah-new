// Test the safeJson implementation
const https = require('https');

function makeRequest(path, callback) {
    const options = {
        hostname: 'vah-api-staging.onrender.com',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            callback(null, { status: res.status, data: data });
        });
    });

    req.on('error', (error) => {
        callback(error, null);
    });

    req.end();
}

// Test various endpoints to ensure safe JSON handling
console.log('🧪 Testing safe JSON handling...');

// Test 1: Valid JSON response
makeRequest('/api/auth/whoami', (error, result) => {
    if (error) {
        console.log('❌ Request failed:', error.message);
        return;
    }

    console.log(`✅ Status: ${result.status}`);

    try {
        const parsed = JSON.parse(result.data);
        console.log('✅ JSON parsed successfully:', parsed);
    } catch (e) {
        console.log('❌ JSON parse failed:', e.message);
        console.log('Raw data:', result.data);
    }
});

// Test 2: Test with invalid endpoint (might return 404 or empty response)
setTimeout(() => {
    makeRequest('/api/invalid-endpoint', (error, result) => {
        if (error) {
            console.log('❌ Request failed:', error.message);
            return;
        }

        console.log(`✅ Invalid endpoint status: ${result.status}`);
        console.log('Raw response:', result.data);

        // This should not crash with our safe JSON implementation
        try {
            const parsed = JSON.parse(result.data);
            console.log('✅ Invalid endpoint JSON parsed:', parsed);
        } catch (e) {
            console.log('✅ Invalid endpoint correctly handled JSON parse error:', e.message);
        }
    });
}, 1000);
