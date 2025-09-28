# Testing Guide

## Quick Reference

### Run Against Render (Production)
```powershell
cd apps/backend

# Smoke tests
$env:BASE_URL="https://vah-api-staging.onrender.com"; ./scripts/smoke.sh

# Jest E2E tests
$env:BASE_URL="https://vah-api-staging.onrender.com"
$env:AUTH_TOKEN=""   # optional JWT for protected routes
npm run test:e2e

# k6 load tests (if installed)
k6 run -e BASE_URL="https://vah-api-staging.onrender.com" tests/k6/smoke.js
```

### Run Against Local Development
```powershell
# Start local server
cd apps/backend
$env:PORT="5007"; $env:DATABASE_URL="postgresql://libanadan@localhost:5432/test?sslmode=disable"; `
$env:NODE_ENV="development"; $env:USE_REMOTE_PROXY="0"; $env:SESSION_SECRET="your-local-secret"; ` # pragma: allowlist secret
node dist/src/server.js

# Run tests (in another terminal)
cd apps/backend
$env:BASE_URL="http://127.0.0.1:5007"; ./scripts/smoke.sh
$env:BASE_URL="http://127.0.0.1:5007"; npm run test:e2e
k6 run -e BASE_URL="http://127.0.0.1:5007" tests/k6/smoke.js
```

## Test Suite Overview

### 1. Smoke Tests (`scripts/smoke.sh`)
- ✅ `/api/healthz` → 200
- ✅ `/api/plans` → 2xx
- ✅ CORS preflight check (non-fatal)

### 2. Jest E2E Tests
- **Health**: `tests/e2e/health.test.ts`
- **Plans**: `tests/e2e/plans.test.ts` 
- **Profile**: `tests/e2e/profile.test.ts` (skips without AUTH_TOKEN)
- **Config**: `jest.e2e.config.js`
- **Helper**: `tests/e2e/client.ts`

### 3. k6 Load Tests
- **File**: `tests/k6/smoke.js`
- **Load**: 10 virtual users for 30 seconds
- **Thresholds**: <1% failure rate, <500ms p95 response time

### 4. CI/CD
- **Workflow**: `.github/workflows/e2e.yml`
- **Triggers**: Push to main branch
- **Target**: `https://vah-api-staging.onrender.com`

## Useful Commands

```bash
# Verbose Jest output
npm run test:e2e -- --verbose

# With coverage
npm run test:e2e -- --coverage

# Filter by test name
npm run test:e2e -- -t "plans"

# Run specific test file
npm run test:e2e -- tests/e2e/health.test.ts
```

## Troubleshooting

### Common Issues

1. **MODULE_NOT_FOUND errors**: Make sure you're running from `apps/backend/` directory
2. **TypeScript export errors**: Verify `src/server/db.ts` and `src/server/db-helpers.ts` export the required functions
3. **PowerShell syntax**: Use `$env:NAME="value"` for environment variables

### Server Paths
- **Real server**: `dist/src/server.js`
- **Shim (compatibility)**: `dist/server/index.js` → redirects to real server
- **Render uses**: `node apps/backend/dist/server/index.js` (shim)

## Adding New Tests

### New E2E Test
1. Create `tests/e2e/your-feature.test.ts`
2. Import `{ api, auth }` from `./client`
3. Use `describe.skip` for conditional tests (require AUTH_TOKEN)

### New k6 Test
1. Create `tests/k6/your-load-test.js`
2. Use `__ENV.BASE_URL` for target URL
3. Set appropriate thresholds in `options`

## Environment Variables

- `BASE_URL`: Target server URL (default: `http://localhost:8080`)
- `AUTH_TOKEN`: JWT for protected routes (optional)
- `NODE_ENV`: Set to `test` for Jest tests
