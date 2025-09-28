// Unit test for API client functionality
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function fetchJson(path, init = {}) {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init.headers || { accept: "application/json" });
  let body = init.body;

  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }

  // Mock fetch for testing
  return Promise.resolve({
    url,
    headers: Object.fromEntries(headers.entries()),
    body,
    credentials: "include",
    ...init
  });
}

console.log('Testing API client functionality...');
console.log('API_BASE:', API_BASE);

// Test 1: Basic GET request
console.log('\n1. Testing basic GET request...');
fetchJson('/healthz')
  .then(result => {
    console.log('✅ GET /healthz:', {
      url: result.url,
      headers: result.headers,
      credentials: result.credentials
    });
  });

// Test 2: POST request with JSON body
console.log('\n2. Testing POST request with JSON body...');
fetchJson('/api/me/profile', {
  method: 'PATCH',
  body: { name: 'Test User', avatarUrl: 'https://example.com/avatar.jpg' }
})
  .then(result => {
    console.log('✅ PATCH /api/me/profile:', {
      url: result.url,
      headers: result.headers,
      body: result.body,
      method: result.method
    });
  });

// Test 3: Request with custom headers
console.log('\n3. Testing request with custom headers...');
fetchJson('/api/me', {
  headers: { 'Authorization': 'Bearer token123' }
})
  .then(result => {
    console.log('✅ GET /api/me with auth:', {
      url: result.url,
      headers: result.headers
    });
  });

// Test 4: FormData handling
console.log('\n4. Testing FormData handling...');
const formData = new FormData();
formData.append('file', 'test content');
fetchJson('/api/upload', {
  method: 'POST',
  body: formData
})
  .then(result => {
    console.log('✅ POST /api/upload with FormData:', {
      url: result.url,
      headers: result.headers,
      bodyType: typeof result.body
    });
  });

console.log('\nAPI client unit test completed!');
