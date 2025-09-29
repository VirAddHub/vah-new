#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-${BASE_URL:-http://localhost:8080}}"
echo "Smoke against: $BASE"

code() { curl -s -o /dev/null -w "%{http_code}" "$1" || echo 000; }

H="$(code "$BASE/api/healthz")"
if [ "$H" != "200" ]; then
  echo "❌ /api/healthz expected 200, got $H"
  exit 1
else
  echo "✅ /api/healthz 200"
fi

P="$(code "$BASE/api/plans")"
if [[ "$P" =~ ^2 ]]; then
  echo "✅ /api/plans 2xx"
else
  echo "❌ /api/plans expected 2xx, got $P"
  exit 1
fi

echo "🎉 Smoke passed"