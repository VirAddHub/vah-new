#!/bin/bash

# Download verification script
# Usage: ./verify-downloads.sh <JWT_TOKEN> <MAIL_ITEM_ID>

JWT_TOKEN=${1:-"your_jwt_token_here"}
MAIL_ID=${2:-"1"}
API_BASE="https://vah-api-staging.onrender.com"

echo "🔍 Verifying download endpoints..."
echo "API Base: $API_BASE"
echo "Mail ID: $MAIL_ID"
echo ""

# Test 1: Scan URL endpoint
echo "1️⃣ Testing scan-url endpoint..."
curl -i -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_BASE/api/mail-items/$MAIL_ID/scan-url" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n"

echo ""
echo "---"

# Test 2: Download alias endpoint (proxy mode)
echo "2️⃣ Testing download alias endpoint (proxy mode)..."
curl -I -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_BASE/api/mail-items/$MAIL_ID/download" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n"

echo ""
echo "---"

# Test 3: Test download endpoint (dev only)
echo "3️⃣ Testing test download endpoint..."
curl -I -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_BASE/api/test/download/test_mail_$MAIL_ID.pdf" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n"

echo ""
echo "✅ Verification complete!"
echo ""
echo "Expected results:"
echo "- scan-url: 200 with JSON {url, filename}"
echo "- download: 200 with Content-Disposition header"
echo "- test: 200 with PDF content"