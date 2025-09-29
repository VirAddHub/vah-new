#!/usr/bin/env bash
set -euo pipefail

# Configuration with defaults
BASE_URL="${1:-${SMOKE_BASE_URL:-${BASE_URL:-https://vah-api-staging.onrender.com}}}"
MAX_WAIT="${SMOKE_MAX_WAIT:-900}"           # 15 minutes default
INITIAL_DELAY="${SMOKE_INITIAL_DELAY:-120}" # 2 minutes initial delay
SLEEP_BASE="${SMOKE_SLEEP_BASE:-2}"         # Base sleep time for backoff

echo "🚀 Smoke test against: $BASE_URL"
echo "⏱️  Max wait: ${MAX_WAIT}s, Initial delay: ${INITIAL_DELAY}s"

# Wait for initial delay to let service warm up
if [ "$INITIAL_DELAY" -gt 0 ]; then
  echo "⏳ Initial delay: ${INITIAL_DELAY}s (letting service warm up)..."
  sleep "$INITIAL_DELAY"
fi

# Helper function to make HTTP requests with timeout
code() { 
  local url="$1"
  local result=$(curl -sS -m 10 --connect-timeout 5 -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  echo "$result"
}

# Retry function with exponential backoff
retry_until_healthy() {
  local endpoint="$1"
  local expected_codes="$2"
  local description="$3"
  local max_attempts=100
  local attempt=0
  local start_time=$(date +%s)
  
  while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    
    if [ $elapsed -ge $MAX_WAIT ]; then
      echo "❌ $description timed out after ${elapsed}s (max: ${MAX_WAIT}s)"
      return 1
    fi
    
    local result=$(code "$BASE_URL$endpoint")
    
    # Check if we got an expected response code
    if [[ " $expected_codes " =~ " $result " ]]; then
      echo "✅ $description $result (attempt $attempt, ${elapsed}s)"
      return 0
    fi
    
    # Check if this is a retryable error
    case "$result" in
      000|429|500|502|503|504)
        # Retryable errors - continue
        ;;
      *)
        echo "❌ $description got non-retryable code: $result"
        return 1
        ;;
    esac
    
    # Calculate backoff time
    local backoff=$((SLEEP_BASE * (2 ** (attempt - 1))))
    if [ $backoff -gt 15 ]; then
      backoff=15
    fi
    
    echo "⏳ $description attempt $attempt: $result. retrying in ${backoff}s (elapsed ${elapsed}s / ${MAX_WAIT}s)"
    sleep $backoff
  done
  
  echo "❌ $description failed after $max_attempts attempts"
  return 1
}

# Test health endpoint
echo "🔍 Testing health endpoint..."
if ! retry_until_healthy "/api/healthz" "200 204" "Health check"; then
  echo "💡 Check if server is running and accessible at $BASE_URL"
  exit 1
fi

# Test plans endpoint
echo "🔍 Testing plans endpoint..."
if ! retry_until_healthy "/api/plans" "200 201 202" "Plans endpoint"; then
  echo "💡 Check if server is running and accessible at $BASE_URL"
  exit 1
fi

# Test webhook endpoint
echo "🔍 Testing webhook endpoint..."
webhook_healthy=false

# Try without auth first
W=$(curl -sS -m 10 --connect-timeout 5 -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/webhooks-postmark" \
  -H "Content-Type: application/json" \
  --data '{"RecordType":"Delivery","MessageID":"smoke-test"}' 2>/dev/null || echo "000")

if [[ "$W" =~ ^(200|204)$ ]]; then
  echo "✅ /api/webhooks-postmark $W (no auth required)"
  webhook_healthy=true
elif [ "$W" = "401" ] && [ -n "${POSTMARK_WEBHOOK_BASIC:-}" ]; then
  echo "🔐 Webhook requires auth, trying with credentials..."
  auth="Basic $(printf %s "$POSTMARK_WEBHOOK_BASIC" | base64)"
  W=$(curl -sS -m 10 --connect-timeout 5 -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/webhooks-postmark" \
    -H "Authorization: $auth" \
    -H "Content-Type: application/json" \
    --data '{"RecordType":"Delivery","MessageID":"smoke-test-auth"}' 2>/dev/null || echo "000")
  
  if [[ "$W" =~ ^(200|204)$ ]]; then
    echo "✅ /api/webhooks-postmark $W (with auth)"
    webhook_healthy=true
  fi
fi

if [ "$webhook_healthy" = false ]; then
  echo "❌ /api/webhooks-postmark expected 200/204, got $W"
  case "$W" in
    000) echo "💡 Connection failed - check if server is running" ;;
    404) echo "💡 Webhook endpoint not found - check deployment" ;;
    401) echo "💡 Webhook requires auth - set POSTMARK_WEBHOOK_BASIC=user:pass or disable auth" ;;
    429) echo "💡 Rate limited - service may be overloaded" ;;
    500|502|503|504) echo "💡 Server error - service may be starting up" ;;
  esac
  exit 1
fi

echo "🎉 All smoke tests passed!"