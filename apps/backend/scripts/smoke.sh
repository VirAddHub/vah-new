#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${1:-${BASE_URL:-https://vah-api-staging.onrender.com}}"
echo "Smoke against: $BASE_URL"

code() { 
  local url="$1"
  local result=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$result" = "000" ]; then
    echo "❌ curl failed for $url (connection refused/timeout)" >&2
  fi
  echo "$result"
}

H="$(code "$BASE_URL/api/healthz")"
if [ "$H" != "200" ]; then
  echo "❌ /api/healthz expected 200, got $H"
  if [ "$H" = "000" ]; then
    echo "💡 Check if server is running and accessible at $BASE_URL"
  fi
  exit 1
else
  echo "✅ /api/healthz 200"
fi

P="$(code "$BASE_URL/api/plans")"
if [[ "$P" =~ ^2 ]]; then
  echo "✅ /api/plans 2xx"
else
  echo "❌ /api/plans expected 2xx, got $P"
  if [ "$P" = "000" ]; then
    echo "💡 Check if server is running and accessible at $BASE_URL"
  fi
  exit 1
fi

# Test webhook (should return 204, not stub) - POST request required
W=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/webhooks-postmark" \
  -H "Content-Type: application/json" \
  --data '{"RecordType":"Delivery","MessageID":"smoke-test"}' 2>/dev/null || echo "000")
if [ "$W" = "204" ]; then
  echo "✅ /api/webhooks-postmark 204 (real handler)"
else
  echo "❌ /api/webhooks-postmark expected 204, got $W"
  if [ "$W" = "200" ]; then
    echo "💡 Webhook may be returning stub response - check deployment"
  elif [ "$W" = "404" ]; then
    echo "💡 Webhook endpoint not found - check deployment"
  fi
  exit 1
fi

echo "🎉 Smoke passed"