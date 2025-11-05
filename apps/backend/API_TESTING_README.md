# API Mock Testing System

Comprehensive mock testing system for all API endpoints.

## Files

- **`test-api-mock-server.js`** - Mock API server that simulates all backend endpoints
- **`test-all-apis-mock.js`** - Test runner that tests all endpoints against the mock server
- **`test-all-apis.sh`** - Convenience script that starts mock server and runs tests

## Quick Start

### Option 1: Run Everything (Recommended)

```bash
# From project root
cd apps/backend
bash test-all-apis.sh
```

This will:
1. Start the mock server on port 3002
2. Run all API tests
3. Stop the mock server automatically

### Option 2: Manual Run

```bash
# Terminal 1: Start mock server
node apps/backend/test-api-mock-server.js

# Terminal 2: Run tests
MOCK_API_URL=http://localhost:3002 node apps/backend/test-all-apis-mock.js
```

### Option 3: Test Against Real Backend

```bash
BACKEND_API_ORIGIN=https://vah-api.onrender.com node apps/backend/test-all-apis-mock.js
```

## What Gets Tested

The system tests **51 API endpoints** across:

- ✅ Health & Status (4 endpoints)
- ✅ Authentication (4 endpoints)
- ✅ Profile (2 endpoints)
- ✅ Mail Items (4 endpoints)
- ✅ Forwarding (2 endpoints)
- ✅ Billing (3 endpoints)
- ✅ Plans (2 endpoints)
- ✅ Contact & Support (2 endpoints)
- ✅ Quiz (2 endpoints)
- ✅ Admin Overview (4 endpoints)
- ✅ Admin Users (4 endpoints)
- ✅ Admin Forwarding (3 endpoints)
- ✅ Admin Mail (2 endpoints)
- ✅ Admin Plans (2 endpoints)
- ✅ Admin Billing (1 endpoint)
- ✅ Companies House (2 endpoints)
- ✅ Address Lookup (1 endpoint)
- ✅ Blog (2 endpoints)
- ✅ KYC (2 endpoints)
- ✅ Email Preferences (2 endpoints)
- ✅ Ops (1 endpoint)

## Mock Data

The mock server provides realistic responses for:
- User authentication
- Mail items
- Forwarding requests
- Billing/subscription data
- Admin metrics
- And more...

## Test Results

Tests show:
- ✅ **Passed** - Endpoint responded correctly
- ❌ **Failed** - Endpoint failed or returned unexpected response
- ⏭️ **Skipped** - Endpoint was skipped (if applicable)

## Customization

### Add More Endpoints

Edit `test-api-mock-server.js` to add new routes:

```javascript
const routes = {
    'GET /api/new-endpoint': (req) => ({ ok: true, data: 'mock' }),
    // ...
};
```

### Add More Tests

Edit `test-all-apis-mock.js` to add new test cases:

```javascript
const endpoints = [
    { name: 'New Endpoint', method: 'GET', path: '/api/new-endpoint' },
    // ...
];
```

### Custom Mock Data

Modify the `mocks` object in `test-api-mock-server.js`:

```javascript
const mocks = {
    user: { /* your mock user data */ },
    // ...
};
```

## Output

The test runner provides:
- Color-coded output (green for pass, red for fail)
- Detailed error messages
- Summary statistics
- List of failed tests (if any)

## Notes

- The mock server runs on port **3002** by default
- All endpoints require authentication (Bearer token) except public endpoints
- Mock responses match the expected API response format
- Tests run sequentially with a 100ms delay between requests

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3002
lsof -ti:3002 | xargs kill -9
```

### Connection Refused

Make sure the mock server is running before running tests.

### Tests Fail Against Real Backend

- Check CORS settings
- Verify authentication tokens
- Ensure backend is accessible
- Check network connectivity

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Test APIs
  run: |
    cd apps/backend
    bash test-all-apis.sh
```

