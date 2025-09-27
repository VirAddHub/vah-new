#!/bin/bash

# Test idempotency key functionality
# Run this after starting your server

echo "Testing idempotency key functionality..."
echo

# Test 1: Create mail item with idempotency key
echo "1. Creating mail item with idempotency key '250910-0001'..."
RESPONSE1=$(curl -s -X POST http://localhost:4000/api/admin/mail-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 250910-0001' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -d '{"user_id":"1","subject":"HMRC PAYE","sender_name":"HMRC","received_date":"2025-09-10","tag":"HMRC"}')

echo "Response 1: $RESPONSE1"
echo

# Test 2: Try to create the same item again with same idempotency key
echo "2. Creating same mail item with same idempotency key '250910-0001'..."
RESPONSE2=$(curl -s -X POST http://localhost:4000/api/admin/mail-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 250910-0001' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -d '{"user_id":"1","subject":"HMRC PAYE","sender_name":"HMRC","received_date":"2025-09-10","tag":"HMRC"}')

echo "Response 2: $RESPONSE2"
echo

# Test 3: Try with invalid idempotency key format
echo "3. Testing invalid idempotency key format..."
RESPONSE3=$(curl -s -X POST http://localhost:4000/api/admin/mail-items \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: invalid-format' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -d '{"user_id":"1","subject":"Test","sender_name":"Test","received_date":"2025-09-10","tag":"Test"}')

echo "Response 3: $RESPONSE3"
echo

echo "Test complete!"
echo
echo "Expected results:"
echo "- Response 1: Should create new mail item"
echo "- Response 2: Should return same mail_item_id as Response 1 (idempotent)"
echo "- Response 3: Should return 422 error for invalid format"
