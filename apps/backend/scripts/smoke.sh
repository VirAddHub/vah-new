#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-${BASE_URL:-https://vah-api-staging.onrender.com}}"
echo "Smoke against: $BASE"

code() { 
  local url="$1"
  local result=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$result" = "000" ]; then
    echo "❌ curl failed for $url (connection refused/timeout)" >&2
  fi
  echo "$result"
}

H="$(code "$BASE/api/healthz")"
if [ "$H" != "200" ]; then
  echo "❌ /api/healthz expected 200, got $H"
  if [ "$H" = "000" ]; then
    echo "💡 Check if server is running and accessible at $BASE"
  fi
  exit 1
else
  echo "✅ /api/healthz 200"
fi

P="$(code "$BASE/api/plans")"
if [[ "$P" =~ ^2 ]]; then
  echo "✅ /api/plans 2xx"
else
  echo "❌ /api/plans expected 2xx, got $P"
  if [ "$P" = "000" ]; then
    echo "💡 Check if server is running and accessible at $BASE"
  fi
  exit 1
fi

echo "🎉 Smoke passed"