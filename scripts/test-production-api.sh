#!/bin/bash
# Production API Testing Script
# Usage: ./scripts/test-production-api.sh [API_URL] [USER_ID]

API_URL=${1:-"https://api.virtualaddresshub.co.uk"}
USER_ID=${2:-42}

echo "🧪 Testing Address API in Production"
echo "🌐 API URL: $API_URL"
echo "👤 User ID: $USER_ID"
echo ""

# Test 1: Assign address
echo "1️⃣ Assigning address..."
ASSIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/me/address/assign" \
  -H "x-user-id: $USER_ID" \
  -H "content-type: application/json" \
  -d '{"locationId":1}')

echo "Status: $(echo "$ASSIGN_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Response:"
echo "$ASSIGN_RESPONSE" | jq '.' 2>/dev/null || echo "$ASSIGN_RESPONSE"
echo ""

# Test 2: Read address
echo "2️⃣ Reading address..."
READ_RESPONSE=$(curl -s "$API_URL/api/me/address" \
  -H "x-user-id: $USER_ID")

echo "Status: $(echo "$READ_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Response:"
echo "$READ_RESPONSE" | jq '.' 2>/dev/null || echo "$READ_RESPONSE"
echo ""

# Test 3: Idempotent assignment
echo "3️⃣ Testing idempotent assignment..."
IDEMPOTENT_RESPONSE=$(curl -s -X POST "$API_URL/api/me/address/assign" \
  -H "x-user-id: $USER_ID" \
  -H "content-type: application/json" \
  -d '{"locationId":1}')

echo "Status: $(echo "$IDEMPOTENT_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Already assigned: $(echo "$IDEMPOTENT_RESPONSE" | jq -r '.already // false')"
echo "Response:"
echo "$IDEMPOTENT_RESPONSE" | jq '.' 2>/dev/null || echo "$IDEMPOTENT_RESPONSE"
echo ""

# Test 4: Unauthenticated request
echo "4️⃣ Testing unauthenticated request..."
UNAUTH_RESPONSE=$(curl -s "$API_URL/api/me/address")

echo "Status: $(echo "$UNAUTH_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Response:"
echo "$UNAUTH_RESPONSE" | jq '.' 2>/dev/null || echo "$UNAUTH_RESPONSE"
echo ""

# Test 5: Capacity test (assign multiple users)
echo "5️⃣ Testing capacity (assigning 5 more users)..."
for i in {100..104}; do
  echo "  Assigning user $i..."
  CAPACITY_RESPONSE=$(curl -s -X POST "$API_URL/api/me/address/assign" \
    -H "x-user-id: $i" \
    -H "content-type: application/json" \
    -d '{"locationId":1}')
  
  STATUS=$(echo "$CAPACITY_RESPONSE" | jq -r '.ok // "ERROR"')
  SUITE=$(echo "$CAPACITY_RESPONSE" | jq -r '.address.components.suite // "N/A"')
  echo "    User $i: $STATUS - $SUITE"
done

echo ""
echo "✅ Production API tests completed!"
echo ""
echo "📊 Next: Check capacity in your database:"
echo "   Run the monitoring query in your PostgreSQL console"
