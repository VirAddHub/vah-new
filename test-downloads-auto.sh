#!/bin/bash

# Automated JWT testing script
# Usage: ./test-downloads-auto.sh [email] [password] [mail_id]

EMAIL=${1:-"user@virtualaddresshub.co.uk"}
PASSWORD=${2:-"UserPass123!"}
MAIL_ID=${3:-"1"}
API_BASE="https://vah-api-staging.onrender.com"

echo "🔐 Getting JWT token for $EMAIL..."

# Get JWT token
TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.token // .data.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get JWT token. Check credentials."
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."
echo ""

# Test 1: List mail items
echo "1️⃣ Testing mail items list..."
curl -s -H "Authorization: Bearer $TOKEN" \
     "$API_BASE/api/mail-items" | jq '.items | length' 2>/dev/null || echo "Failed"
echo ""

# Test 2: Get scan URL
echo "2️⃣ Testing scan URL endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" \
     "$API_BASE/api/mail-items/$MAIL_ID/scan-url" | jq '.ok' 2>/dev/null || echo "Failed"
echo ""

# Test 3: Download alias
echo "3️⃣ Testing download alias..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/mail-items/$MAIL_ID/download")
echo "HTTP Status: $HTTP_CODE"
echo ""

# Test 4: Test download endpoint
echo "4️⃣ Testing test download endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/test/download/test_mail_$MAIL_ID.pdf")
echo "HTTP Status: $HTTP_CODE"
echo ""

echo "✅ Testing complete!"
echo ""
echo "Summary:"
echo "- Mail items: $(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/mail-items" | jq '.items | length' 2>/dev/null || echo 'Failed') items found"
echo "- Scan URL: $(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/mail-items/$MAIL_ID/scan-url" | jq '.ok' 2>/dev/null || echo 'Failed')"
echo "- Download alias: $HTTP_CODE"
echo "- Test endpoint: $HTTP_CODE"
