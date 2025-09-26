#!/bin/bash
# Test script for address API endpoints
# Usage: ./scripts/test-address-api.sh YOUR_API_URL USER_ID

API_URL=${1:-"https://your-api.render.com"}
USER_ID=${2:-42}

echo "🧪 Testing Address API at: $API_URL"
echo "👤 Using User ID: $USER_ID"
echo ""

# Test 1: Assign address
echo "1️⃣ Assigning address..."
ASSIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/me/address/assign" \
  -H "x-user-id: $USER_ID" \
  -H "content-type: application/json" \
  -d '{"locationId":1}')

echo "Response:"
echo "$ASSIGN_RESPONSE" | jq '.' 2>/dev/null || echo "$ASSIGN_RESPONSE"
echo ""

# Test 2: Read address
echo "2️⃣ Reading address..."
READ_RESPONSE=$(curl -s "$API_URL/api/me/address" \
  -H "x-user-id: $USER_ID")

echo "Response:"
echo "$READ_RESPONSE" | jq '.' 2>/dev/null || echo "$READ_RESPONSE"
echo ""

# Test 3: Idempotent assignment (should return same address)
echo "3️⃣ Testing idempotent assignment..."
IDEMPOTENT_RESPONSE=$(curl -s -X POST "$API_URL/api/me/address/assign" \
  -H "x-user-id: $USER_ID" \
  -H "content-type: application/json" \
  -d '{"locationId":1}')

echo "Response:"
echo "$IDEMPOTENT_RESPONSE" | jq '.' 2>/dev/null || echo "$IDEMPOTENT_RESPONSE"
echo ""

# Test 4: Unauthenticated request (should return 401)
echo "4️⃣ Testing unauthenticated request..."
UNAUTH_RESPONSE=$(curl -s "$API_URL/api/me/address")

echo "Response:"
echo "$UNAUTH_RESPONSE" | jq '.' 2>/dev/null || echo "$UNAUTH_RESPONSE"
echo ""

echo "✅ API tests completed!"
