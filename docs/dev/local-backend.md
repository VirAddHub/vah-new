# docs/dev/local-backend.md
## Build
npm run build:backend

## Run (bash)
PORT=8080 DISABLE_SQLITE=true DATABASE_URL=postgresql://test:test@localhost:5432/test  # pragma: allowlist secret \
node apps/backend/dist/server/index.js

## Run (PowerShell)
$env:PORT = "8080"
$env:DISABLE_SQLITE = "true"
$env:DATABASE_URL = "postgresql://test:test@localhost:5432/test"  # pragma: allowlist secret
node apps/backend/dist/server/index.js

## Smoke
# Bash
apps/backend/scripts/smoke.sh http://localhost:8080
# PowerShell
$env:BASE_URL="http://localhost:8080"; apps/backend/scripts/smoke.sh

## Windows / PowerShell quick run

```powershell
$env:PORT = "8080"
$env:DISABLE_SQLITE = "true"
$env:DATABASE_URL = "postgresql://test:test@localhost:5432/test"  # pragma: allowlist secret
$env:NODE_ENV = "development"
$env:SESSION_SECRET = "dev-local-secret"  # pragma: allowlist secret
node dist/server/index.js
```

In another window:

```powershell
# Test against local server
$env:BASE_URL = "http://localhost:8080"
bash apps/backend/scripts/smoke.sh

# Or test against staging (no local server needed)
$env:BASE_URL = "https://vah-api-staging.onrender.com"
bash apps/backend/scripts/smoke.sh
```

## One-time Postgres setup (if using test:test DSN)

```bash
psql -U postgres -c "CREATE ROLE test LOGIN PASSWORD 'test';"  # pragma: allowlist secret
psql -U postgres -c "ALTER ROLE test CREATEDB;"
createdb -U test test
```