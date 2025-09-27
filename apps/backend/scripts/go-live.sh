#!/usr/bin/env bash
set -euo pipefail

echo "==> GO LIVE: build, init DB, start web+api, verify"

# 0) sanity
command -v node >/dev/null || { echo "Node required"; exit 1; }
command -v npm  >/dev/null || { echo "npm required";  exit 1; }

# 1) env
[ -f .env.production ] || {
  echo "Missing .env.production. Copying template…"
  cp env.production.example .env.production
  echo ">>> Edit .env.production then re-run"; exit 1;
}

# 2) deps + build web
npm ci
npm run build

# 3) database (SQLite today)
npm run db:init
npm run db:integrity

# 4) start api (4000) + web (3000)
if ! npx --yes concurrently -v >/dev/null 2>&1; then npm i -D concurrently; fi
npm run start:prod &

# 5) wait for api
for i in {1..30}; do curl -sf http://localhost:4000/api/health >/dev/null 2>&1 && break || sleep 1; done
curl -s http://localhost:4000/api/health || { echo "API health failed"; exit 1; }

# 6) wait for web
for i in {1..30}; do curl -sf http://localhost:3000 >/dev/null 2>&1 && break || sleep 1; done

# 7) light smoke
echo "==> API health:"
curl -s http://localhost:4000/api/health | jq . || true

echo "==> GO LIVE READY ✅  Web: http://localhost:3000  API: http://localhost:4000"
