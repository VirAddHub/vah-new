#!/bin/bash

# Quick contact form test script
# Usage: ./test-contact.sh [base_url]

BASE_URL=${1:-"http://localhost:3000"}
API_URL="${BASE_URL}/api/contact"

echo "🧪 Testing contact form at: $API_URL"
echo ""

# Test 1: Valid submission
echo "✅ Test 1: Valid submission"
curl -i -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "subject":"Website enquiry",
    "message":"Hello from curl test!",
    "website":""
  }'
echo ""
echo ""

# Test 2: Invalid email
echo "❌ Test 2: Invalid email"
curl -i -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"invalid-email",
    "subject":"Test",
    "message":"Test message",
    "website":""
  }'
echo ""
echo ""

# Test 3: Spam detection (honeypot)
echo "🚫 Test 3: Spam detection (honeypot)"
curl -i -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Spam Bot",
    "email":"spam@example.com",
    "subject":"Spam",
    "message":"Spam message",
    "website":"http://spam.com"
  }'
echo ""
echo ""

# Test 4: Missing required fields
echo "⚠️  Test 4: Missing required fields"
curl -i -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "website":""
  }'
echo ""
echo ""

echo "🎯 Test complete! Check the responses above."
echo ""
echo "Expected results:"
echo "  ✅ Test 1: 200 OK (or 500 if email service not configured)"
echo "  ❌ Test 2: 400 Bad Request (invalid email)"
echo "  🚫 Test 3: 400 Bad Request (spam detected)"
echo "  ⚠️  Test 4: 400 Bad Request (missing fields)"
