#!/usr/bin/env bash
set -e
API="${1:-https://vah-api.onrender.com}"

echo "Testing API at: $API"
echo "Note: If this fails, check your Render dashboard for the exact URL"
echo

echo "Preflight from localhost:"
curl -si -X OPTIONS "$API/api/auth/whoami" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" | sed -n '1,20p'
echo
echo "Preflight from Vercel preview:"
curl -si -X OPTIONS "$API/api/auth/whoami" \
  -H "Origin: https://vah-frontend-final.vercel.app" \
  -H "Access-Control-Request-Method: GET" | sed -n '1,20p'
echo
echo "Preflight from production domain:"
curl -si -X OPTIONS "$API/api/auth/whoami" \
  -H "Origin: https://virtualaddresshub.co.uk" \
  -H "Access-Control-Request-Method: GET" | sed -n '1,20p'
