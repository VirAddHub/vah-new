# 🧪 Mailroom System Tests

This directory contains comprehensive tests for the mailroom system functionality.

## Test Files

### Core Tests
- `test-comprehensive.mjs` - Complete system health and feature verification
- `test-endpoints.mjs` - Specific endpoint functionality testing
- `test-production-ready.mjs` - Production readiness assessment
- `test-webhook.mjs` - OneDrive webhook testing
- `test-basic.mjs` - Basic server connectivity tests

### Manual Tests
- `test-idempotency.sh` - Manual idempotency key testing script

## Running Tests

### Run All Tests
```bash
# Run comprehensive test
node test/test-comprehensive.mjs

# Run production readiness test
node test/test-production-ready.mjs

# Run endpoint tests
node test/test-endpoints.mjs
```

### Run Individual Tests
```bash
# Test specific functionality
node test/test-webhook.mjs
node test/test-basic.mjs

# Manual idempotency test (requires server running)
./test/test-idempotency.sh
```

## Test Requirements

- Server must be running on `http://localhost:4000`
- All dependencies installed (`npm install`)
- Database schema updated (automatic on server start)

## Test Coverage

✅ **System Health**
- Server connectivity
- Database connection
- CSRF protection

✅ **Core Features**
- Idempotency key validation
- Scan guard logic
- UI component structure
- Retention calculations

✅ **API Endpoints**
- Status endpoint
- CSRF endpoint
- Admin endpoints (auth required)
- Webhook endpoints

✅ **Configuration**
- Environment variables
- Database schema
- Security settings

## Expected Results

All tests should pass with the server running. Some tests may show warnings for:
- Authentication requirements (expected)
- Webhook signature validation (expected for security)
- Production configuration (pending deployment setup)

## Notes

- Tests are designed to work without authentication for core functionality
- Admin endpoints require proper JWT tokens for full testing
- OneDrive webhook requires HMAC signature for security
