#!/bin/bash

# CORS Verification Script
# Usage: bash scripts/verify-cors.sh https://vah-api-staging.onrender.com

API_URL=${1:-"https://vah-api-staging.onrender.com"}

echo "🔍 Testing CORS for API: $API_URL"
echo ""

# Test CORS preflight
echo "1. Testing CORS preflight..."
curl -s -i -X OPTIONS "$API_URL/api/auth/whoami" \
  -H "Origin: https://vah-frontend-final.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" | head -20

echo ""
echo "2. Testing CORS with actual request..."
curl -s -i "$API_URL/api/auth/whoami" \
  -H "Origin: https://vah-frontend-final.vercel.app" | head -10

echo ""
echo "3. Testing health endpoint..."
curl -s -i "$API_URL/api/health" | head -5

echo ""
echo "✅ CORS verification complete!"
echo "Check for 'Access-Control-Allow-Origin' headers above."
