#!/bin/bash
# Comprehensive API Testing Script
# Tests all APIs including the new address system

API_URL=${1:-"http://localhost:4000"}
USER_ID=${2:-42}

echo "🧪 Testing All APIs"
echo "🌐 API URL: $API_URL"
echo "👤 User ID: $USER_ID"
echo ""

# Test 1: Health Check
echo "1️⃣ Health Check..."
HEALTH_RESPONSE=$(curl -s "$API_URL/api/health")
echo "Status: $(echo "$HEALTH_RESPONSE" | jq -r '.status // "ERROR"')"
echo "Response: $HEALTH_RESPONSE"
echo ""

# Test 2: CSRF Token
echo "2️⃣ CSRF Token..."
CSRF_RESPONSE=$(curl -s "$API_URL/csrf")
echo "Status: $(echo "$CSRF_RESPONSE" | jq -r '.csrfToken // "ERROR"')"
echo "Response: $CSRF_RESPONSE"
echo ""

# Test 3: Address API - Assign
echo "3️⃣ Address Assignment..."
ASSIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/me/address/assign" \
  -H "x-user-id: $USER_ID" \
  -H "content-type: application/json" \
  -d '{"locationId":1}')

echo "Status: $(echo "$ASSIGN_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Response:"
echo "$ASSIGN_RESPONSE" | jq '.' 2>/dev/null || echo "$ASSIGN_RESPONSE"
echo ""

# Test 4: Address API - Read
echo "4️⃣ Address Retrieval..."
READ_RESPONSE=$(curl -s "$API_URL/api/me/address" \
  -H "x-user-id: $USER_ID")

echo "Status: $(echo "$READ_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Response:"
echo "$READ_RESPONSE" | jq '.' 2>/dev/null || echo "$READ_RESPONSE"
echo ""

# Test 5: Address API - Idempotent Assignment
echo "5️⃣ Address Idempotent Assignment..."
IDEMPOTENT_RESPONSE=$(curl -s -X POST "$API_URL/api/me/address/assign" \
  -H "x-user-id: $USER_ID" \
  -H "content-type: application/json" \
  -d '{"locationId":1}')

echo "Status: $(echo "$IDEMPOTENT_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Already assigned: $(echo "$IDEMPOTENT_RESPONSE" | jq -r '.already // false')"
echo "Response:"
echo "$IDEMPOTENT_RESPONSE" | jq '.' 2>/dev/null || echo "$IDEMPOTENT_RESPONSE"
echo ""

# Test 6: Address API - Unauthenticated
echo "6️⃣ Address Unauthenticated Request..."
UNAUTH_RESPONSE=$(curl -s "$API_URL/api/me/address")

echo "Status: $(echo "$UNAUTH_RESPONSE" | jq -r '.ok // "ERROR"')"
echo "Response:"
echo "$UNAUTH_RESPONSE" | jq '.' 2>/dev/null || echo "$UNAUTH_RESPONSE"
echo ""

# Test 7: Other Key APIs
echo "7️⃣ Testing Other Key APIs..."

# Profile API
echo "  - Profile API..."
PROFILE_RESPONSE=$(curl -s "$API_URL/api/profile" -H "x-user-id: $USER_ID")
echo "    Status: $(echo "$PROFILE_RESPONSE" | jq -r '.ok // "ERROR"')"

# Billing API
echo "  - Billing API..."
BILLING_RESPONSE=$(curl -s "$API_URL/api/billing" -H "x-user-id: $USER_ID")
echo "    Status: $(echo "$BILLING_RESPONSE" | jq -r '.ok // "ERROR"')"

# Mail Forward API
echo "  - Mail Forward API..."
MAIL_RESPONSE=$(curl -s "$API_URL/api/mail/forward" -H "x-user-id: $USER_ID")
echo "    Status: $(echo "$MAIL_RESPONSE" | jq -r '.ok // "ERROR"')"

echo ""
echo "✅ API testing completed!"
echo ""
echo "📊 Summary:"
echo "  - Health Check: $(echo "$HEALTH_RESPONSE" | jq -r '.status // "FAILED"')"
echo "  - CSRF Token: $(echo "$CSRF_RESPONSE" | jq -r '.csrfToken // "FAILED"')"
echo "  - Address Assign: $(echo "$ASSIGN_RESPONSE" | jq -r '.ok // "FAILED"')"
echo "  - Address Read: $(echo "$READ_RESPONSE" | jq -r '.ok // "FAILED"')"
echo "  - Address Idempotent: $(echo "$IDEMPOTENT_RESPONSE" | jq -r '.ok // "FAILED"')"
echo "  - Address Unauth: $(echo "$UNAUTH_RESPONSE" | jq -r '.ok // "FAILED"')"
