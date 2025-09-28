#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://vah-api-staging.onrender.com}"
echo "Smoke against: $BASE_URL"

fail() { echo "❌ $1"; exit 1; }

# Health
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/healthz") || true
[[ "$code" == "200" ]] || fail "/api/healthz expected 200, got $code"
echo "✅ /api/healthz 200"

# Plans (public)
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/plans") || true
[[ "$code" =~ ^2..$ ]] || fail "/api/plans expected 2xx, got $code"
echo "✅ /api/plans 2xx"

# CORS preflight (should be 204/200 typically)
code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  "$BASE_URL/api/healthz") || true
[[ "$code" =~ ^20(0|4)$ ]] || echo "⚠️  Preflight non-2xx ($code) — not fatal"

echo "🎉 Smoke passed"