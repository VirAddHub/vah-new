#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking for unnamed catch-all patterns '(.*)'..."

# Use ripgrep if available, otherwise fall back to grep
if command -v rg >/dev/null 2>&1; then
  if rg -n --hidden --glob '!node_modules' "'\\(\\.\\*\\)'" server routes; then
    echo "❌ Found unnamed catch-alls '(.*)'. Use '/:path(.*)' instead." >&2
    echo "   This breaks path-to-regexp v6 compatibility." >&2
    exit 1
  fi
else
  # Fallback to grep
  if grep -r --include="*.js" --include="*.ts" --exclude-dir="node_modules" "'(\\.\\*)" server routes 2>/dev/null; then
    echo "❌ Found unnamed catch-alls '(.*)'. Use '/:path(.*)' instead." >&2
    echo "   This breaks path-to-regexp v6 compatibility." >&2
    exit 1
  fi
fi

echo "✅ No unnamed catch-alls found."
echo "✅ All wildcard patterns use named parameters (path-to-regexp v6 compatible)."
