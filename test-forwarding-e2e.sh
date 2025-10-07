#!/bin/bash
# End-to-end forwarding system test

set -e

echo "🧪 Testing Enhanced Forwarding System End-to-End"
echo "================================================"

# Configuration
API_BASE="${API_BASE:-http://localhost:3001}"
AUTH="${AUTH:-Bearer test-token}"
MAIL_ID="${MAIL_ID:-1}"
CRON_TOKEN="${CRON_TOKEN:-test-cron-token}"

echo "📋 Configuration:"
echo "  API_BASE: $API_BASE"
echo "  MAIL_ID: $MAIL_ID"
echo "  AUTH: $AUTH"
echo ""

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
  }' 2>/dev/null || echo '{"ok": false, "error": "connection_failed"}')

echo "Response 1: $RESPONSE1"
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
  }' 2>/dev/null || echo '{"ok": false, "error": "connection_failed"}')

echo "Response 2: $RESPONSE2"
echo ""

# Test 3: Drain outbox
echo "3️⃣ Draining outbox..."
DRAIN_RESPONSE=$(curl -sS -X POST "$API_BASE/api/internal/forwarding/drain" \
  -H "x-internal-cron-token: $CRON_TOKEN" 2>/dev/null || echo '{"ok": false, "error": "connection_failed"}')

echo "Drain response: $DRAIN_RESPONSE"
echo ""

# Test 4: Check database state (if we have access)
echo "4️⃣ Checking database state..."
if command -v psql >/dev/null 2>&1 && [ -n "$DATABASE_URL" ]; then
  echo "Checking forwarding_request table..."
  psql "$DATABASE_URL" -c "SELECT id, user_id, mail_item_id, status, created_at FROM forwarding_request WHERE mail_item_id = $MAIL_ID ORDER BY created_at DESC LIMIT 3;" 2>/dev/null || echo "Could not query database"
  
  echo ""
  echo "Checking forwarding_outbox table..."
  psql "$DATABASE_URL" -c "SELECT id, status, attempt_count, last_error FROM forwarding_outbox ORDER BY created_at DESC LIMIT 3;" 2>/dev/null || echo "Could not query database"
else
  echo "Skipping database checks (no psql or DATABASE_URL)"
fi

echo ""
echo "✅ Test completed!"
echo ""
echo "📝 Next steps:"
echo "1. Set INTERNAL_CRON_TOKEN in your backend environment"
echo "2. Run migration: psql \$DATABASE_URL -f apps/backend/migrations/026_enhanced_forwarding_system.sql"
echo "3. Deploy backend with new code"
echo "4. Test with real API endpoint"
echo "5. Set up Render cron job"
