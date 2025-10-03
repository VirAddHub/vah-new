#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Installing deps (prefer ci)..."
if npm ci --include=dev 2>/dev/null; then
  echo "✅ npm ci succeeded"
else
  echo "⚠️ npm ci failed — falling back to npm install"
  npm install --workspaces --include=dev
fi

echo "🏗️ Building backend..."
npm run -w apps/backend build
