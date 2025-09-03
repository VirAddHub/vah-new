#!/usr/bin/env bash
set -euo pipefail

BANNED='login_test_admin_bypass|login_test_admin_rescue|/api/test/elevate|/api/test/login'
ROUTES="app\.(get|post|put|delete)\('/api/test"

scan() {
  local pattern="$1"
  # Build list of files to scan
  find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.history/*" \
    -not -path "./tests/*" \
    -not -path "./logs/*" \
    -not -path "./coverage/*" \
    -not -path "./dist/*" \
    -not -path "./build/*" \
    -not -path "./tmp/*" \
    -not -path "./scripts/banlist.sh" \
    -print0 \
  | xargs -0 grep -nE "$pattern"
}

# 1) Hard bans (must not exist in prod code)
if scan "$BANNED"; then
  echo "❌ Banned test bypass present"
  exit 1
fi

# 2) Flag any stray /api/test routes (sanity check)
if scan "$ROUTES"; then
  echo "⚠️  Found /api/test route(s) — verify they are not present in prod code."
  exit 1
fi

echo "✅ No banned test bypasses found."
