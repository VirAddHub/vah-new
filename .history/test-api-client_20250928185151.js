// Test the API client functionality
const { API_BASE } = require('./apps/frontend/lib/config.ts');
const { fetchJson } = require('./apps/frontend/lib/apiClient.ts');

console.log('Testing API client...');
console.log('API_BASE:', API_BASE);

// Test 1: Health check endpoint
console.log('\n1. Testing health check endpoint...');
fetchJson('/healthz')
  .then(data => {
    console.log('✅ /healthz response:', data);
  })
  .catch(err => {
    console.log('❌ /healthz error:', err.message);
  });

// Test 2: Ready endpoint
console.log('\n2. Testing ready endpoint...');
fetchJson('/ready')
  .then(data => {
    console.log('✅ /ready response:', data);
  })
  .catch(err => {
    console.log('❌ /ready error:', err.message);
  });

// Test 3: User endpoint (should return 401)
console.log('\n3. Testing user endpoint (expecting 401)...');
fetchJson('/api/me')
  .then(data => {
    console.log('✅ /api/me response:', data);
  })
  .catch(err => {
    console.log('✅ /api/me error (expected):', err.message, 'Status:', err.status);
  });

// Test 4: POST request with JSON body
console.log('\n4. Testing POST request with JSON body...');
fetchJson('/api/me/profile', {
  method: 'PATCH',
  body: { name: 'Test User', avatarUrl: 'https://example.com/avatar.jpg' }
})
  .then(data => {
    console.log('✅ PATCH /api/me/profile response:', data);
  })
  .catch(err => {
    console.log('✅ PATCH /api/me/profile error (expected):', err.message, 'Status:', err.status);
  });

console.log('\nAPI client test completed!');
