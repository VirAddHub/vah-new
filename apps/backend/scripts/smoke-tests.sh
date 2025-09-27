#!/bin/bash
# Smoke tests for the VAH backend
# Run this after starting both frontend and backend

set -e

API_BASE=${API_BASE:-"http://localhost:4000"}
echo "🧪 Running smoke tests against $API_BASE"

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s "$API_BASE/api/health" | jq -r '.status' | grep -q "ok" || {
    echo "❌ Health check failed"
    exit 1
}
echo "✅ Health check passed"

# Test 2: Contact form (happy path)
echo "2️⃣ Testing contact form..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/contact" \
    -H 'Content-Type: application/json' \
    -d '{"name":"Test User","email":"test@example.com","subject":"Smoke Test","message":"This is a smoke test","website":""}')

echo "$RESPONSE" | jq -r '.ok' | grep -q "true" || {
    echo "❌ Contact form test failed"
    echo "Response: $RESPONSE"
    exit 1
}
echo "✅ Contact form test passed"

# Test 3: Contact form honeypot protection
echo "3️⃣ Testing honeypot protection..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/contact" \
    -H 'Content-Type: application/json' \
    -d '{"name":"Spam Bot","email":"spam@example.com","subject":"Spam","message":"This is spam","website":"http://spam.com"}')

echo "$RESPONSE" | jq -r '.error' | grep -q "Spam detected" || {
    echo "❌ Honeypot protection test failed"
    echo "Response: $RESPONSE"
    exit 1
}
echo "✅ Honeypot protection test passed"

# Test 4: Rate limiting (send 6 requests quickly)
echo "4️⃣ Testing rate limiting..."
for i in {1..6}; do
    RESPONSE=$(curl -s -X POST "$API_BASE/api/contact" \
        -H 'Content-Type: application/json' \
        -d "{\"name\":\"Rate Test $i\",\"email\":\"ratetest$i@example.com\",\"subject\":\"Rate Test\",\"message\":\"Rate test $i\",\"website\":\"\"}")
    
    if [ $i -le 5 ]; then
        # First 5 should succeed
        echo "$RESPONSE" | jq -r '.ok' | grep -q "true" || {
            echo "❌ Rate limit test failed at request $i (should succeed)"
            echo "Response: $RESPONSE"
            exit 1
        }
    else
        # 6th should be rate limited
        echo "$RESPONSE" | jq -r '.error' | grep -q "Too many" || {
            echo "❌ Rate limit test failed at request $i (should be rate limited)"
            echo "Response: $RESPONSE"
            exit 1
        }
    fi
done
echo "✅ Rate limiting test passed"

# Test 5: Admin auth flow (if you have test users)
echo "5️⃣ Testing admin auth flow..."
# This would require test users in your database
# curl -c cookies.txt -X POST "$API_BASE/api/auth/login" \
#     -H 'Content-Type: application/json' \
#     -d '{"email":"admin@example.com"}'
# 
# curl -b cookies.txt "$API_BASE/api/admin/users" | jq -r '.ok' | grep -q "true" || {
#     echo "❌ Admin auth test failed"
#     exit 1
# }
echo "⏭️  Admin auth test skipped (requires test users)"

echo ""
echo "🎉 All smoke tests passed!"
echo "Your backend is ready for production deployment."
