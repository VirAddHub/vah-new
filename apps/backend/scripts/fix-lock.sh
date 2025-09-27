#!/usr/bin/env bash
set -euo pipefail
echo "🔧 Resolving lockfile deterministically (npm)…"
rm -rf node_modules package-lock.json
npm install
git add package.json package-lock.json
git commit -m "Resolve deps; regenerate lockfile" || echo "No changes to commit."
echo "✅ Done."
