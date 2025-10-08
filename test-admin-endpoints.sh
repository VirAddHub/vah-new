#!/bin/bash

# Test script for admin endpoints
# Usage: ./test-admin-endpoints.sh <API_HOST> <ADMIN_COOKIE>

API_HOST=${1:-"https://vah-api-staging.onrender.com"}
ADMIN_COOKIE=${2:-"vah_session=YOUR_ADMIN_COOKIE"}

echo "🧪 Testing admin endpoints on $API_HOST"
echo "================================================"

# Test 1: Port binding check
echo "1️⃣ Checking port binding..."
curl -s "$API_HOST/api/healthz" | head -1

# Test 2: Forwarding requests (should return 200)
echo -e "\n2️⃣ Testing forwarding requests..."
for i in {1..3}; do
  echo "Request $i:"
  curl -I -b "$ADMIN_COOKIE" \
    "$API_HOST/api/admin/forwarding/requests?limit=50&offset=0" \
    2>/dev/null | grep -E "(HTTP|Cache-Control|Retry-After)"
done

# Test 3: Mail items (should return 200)
echo -e "\n3️⃣ Testing mail items..."
for i in {1..3}; do
  echo "Request $i:"
  curl -I -b "$ADMIN_COOKIE" \
    "$API_HOST/api/admin/mail-items?status=received&q=&tag=&page=1&page_size=20" \
    2>/dev/null | grep -E "(HTTP|Cache-Control|Retry-After)"
done

# Test 4: Rate limiting (should see 429s after 20 requests)
echo -e "\n4️⃣ Testing rate limiting (sending 25 requests quickly)..."
for i in {1..25}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_COOKIE" \
    "$API_HOST/api/admin/forwarding/requests?limit=50&offset=0")
  echo -n "$status "
  if [ $((i % 10)) -eq 0 ]; then echo; fi
done
echo

# Test 5: Coalescing test (10 concurrent requests)
echo -e "\n5️⃣ Testing request coalescing (10 concurrent requests)..."
if command -v parallel >/dev/null 2>&1; then
  seq 1 10 | parallel -n0 -j10 curl -s -o /dev/null -w "%{http_code}\n" \
    -b "$ADMIN_COOKIE" \
    "$API_HOST/api/admin/mail-items?status=received&page=1&page_size=20"
else
  echo "GNU parallel not found, running sequential test..."
  for i in {1..10}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_COOKIE" \
      "$API_HOST/api/admin/mail-items?status=received&page=1&page_size=20")
    echo "$status"
  done
fi

echo -e "\n✅ Tests completed!"
echo "Expected results:"
echo "- All requests should return 200 (except rate limit test)"
echo "- Cache-Control: private, max-age=5 should be present"
echo "- Rate limit test should show some 429s after 20 requests"
echo "- Coalescing test should show mostly 200s with minimal DB load"
