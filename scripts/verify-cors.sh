#!/usr/bin/env bash
API="${1:-https://vah-api-staging.onrender.com}"

echo "Preflight from localhost (should allow):"
curl -i -X OPTIONS "$API/api/auth/whoami" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" | sed -n '1,20p'

echo
echo "Preflight from your Vercel preview (should allow):"
curl -i -X OPTIONS "$API/api/auth/whoami" \
  -H "Origin: https://vah-frontend-final.vercel.app" \
  -H "Access-Control-Request-Method: GET" | sed -n '1,20p'
