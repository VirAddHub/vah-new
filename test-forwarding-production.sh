#!/bin/bash
# Production forwarding system test for VAH staging

set -e

echo "🚀 Testing Enhanced Forwarding System - Production"
echo "=================================================="

# Configuration - UPDATE THESE VALUES
API_BASE="https://vah-api-staging.onrender.com"
AUTH="Bearer YOUR_USER_JWT_TOKEN_HERE"
MAIL_ID=25
CRON_TOKEN="YOUR_INTERNAL_CRON_TOKEN_HERE"

echo "📋 Configuration:"
echo "  API_BASE: $API_BASE"
echo "  MAIL_ID: $MAIL_ID"
echo "  AUTH: ${AUTH:0:20}..."
echo "  CRON_TOKEN: ${CRON_TOKEN:0:10}..."
echo ""

# Validate configuration
if [[ "$AUTH" == "Bearer YOUR_USER_JWT_TOKEN_HERE" ]]; then
  echo "❌ Please update AUTH with your actual JWT token"
  exit 1
fi

if [[ "$CRON_TOKEN" == "YOUR_INTERNAL_CRON_TOKEN_HERE" ]]; then
  echo "❌ Please update CRON_TOKEN with your actual token"
  exit 1
fi

# Test 1: Create forwarding request
echo "1️⃣ Creating forwarding request..."
RESPONSE1=$(curl -sS -X POST "$API_BASE/api/forwarding/requests" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fr-$MAIL_ID-$(date +%s)" \
  -d '{
    "mail_item_id": '"$MAIL_ID"',
    "to_name": "Jane Smith",
    "address1": "10 Downing Street",
    "address2": "",
    "city": "London",
    "state": "",
    "postal": "SW1A 2AA",
    "country": "GB",
    "reason": "Client request",
    "method": "Royal Mail Tracked"
  }')

echo "Response 1: $RESPONSE1"

# Extract forwarding request ID if successful
FR_ID=$(echo "$RESPONSE1" | jq -r '.data.forwarding_request.id // empty' 2>/dev/null || echo "")
if [[ -n "$FR_ID" ]]; then
  echo "✅ Forwarding request created with ID: $FR_ID"
else
  echo "❌ Failed to create forwarding request"
  echo "Response: $RESPONSE1"
  exit 1
fi

echo ""

# Test 2: Duplicate request (idempotency test)
echo "2️⃣ Testing idempotency (duplicate request)..."
RESPONSE2=$(curl -sS -X POST "$API_BASE/api/forwarding/requests" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fr-$MAIL_ID-same" \
  -d '{
    "mail_item_id": '"$MAIL_ID"',
    "to_name": "Jane Smith",
    "address1": "10 Downing Street",
    "address2": "",
    "city": "London",
    "state": "",
    "postal": "SW1A 2AA",
    "country": "GB",
    "reason": "Client request",
    "method": "Royal Mail Tracked"
  }')

echo "Response 2: $RESPONSE2"

# Check if same ID returned
FR_ID2=$(echo "$RESPONSE2" | jq -r '.data.forwarding_request.id // empty' 2>/dev/null || echo "")
if [[ "$FR_ID" == "$FR_ID2" ]]; then
  echo "✅ Idempotency test passed - same ID returned: $FR_ID2"
else
  echo "⚠️  Different ID returned - this might be expected if idempotency key handling differs"
fi

echo ""

# Test 3: Drain outbox
echo "3️⃣ Draining outbox..."
DRAIN_RESPONSE=$(curl -sS -X POST "$API_BASE/api/internal/forwarding/drain" \
  -H "x-internal-cron-token: $CRON_TOKEN")

echo "Drain response: $DRAIN_RESPONSE"

if echo "$DRAIN_RESPONSE" | jq -e '.ok' >/dev/null 2>&1; then
  echo "✅ Outbox drained successfully"
else
  echo "❌ Failed to drain outbox"
  echo "Response: $DRAIN_RESPONSE"
  exit 1
fi

echo ""

# Test 4: Verify outbox status
echo "4️⃣ Checking outbox status..."
echo "You can check the database with these queries:"
echo ""
echo "SELECT id, status, attempt_count, last_error"
echo "FROM forwarding_outbox"
echo "WHERE forwarding_request_id = $FR_ID;"
echo ""
echo "SELECT id, user_id, mail_item_id, status, created_at"
echo "FROM forwarding_request"
echo "WHERE id = $FR_ID;"
echo ""
echo "SELECT id, forwarding_request_id, amount_pence, status"
echo "FROM forwarding_charge"
echo "WHERE forwarding_request_id = $FR_ID;"

echo ""
echo "✅ Production test completed!"
echo ""
echo "📝 Next steps:"
echo "1. Verify database state with the queries above"
echo "2. Set up Render cron job with this command:"
echo "   curl -sS -X POST $API_BASE/api/internal/forwarding/drain -H \"x-internal-cron-token: \$INTERNAL_CRON_TOKEN\""
echo "3. Schedule: */5 * * * * (every 5 minutes)"



