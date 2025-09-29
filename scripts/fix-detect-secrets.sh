#!/usr/bin/env bash
# Quick fix for detect-secrets errors
set -euo pipefail

echo "🔍 Finding stray backup files..."
git ls-files -o --exclude-standard | grep -Ei '\.(bak|backup)$' || echo "✅ No backup files found"

echo "🧹 Removing any cached backup files..."
git rm --cached -r --ignore-unmatch '**/*.bak' '**/*.backup' || true

echo "🔄 Refreshing detect-secrets baseline..."
detect-secrets scan > .secrets.baseline

echo "📋 Review findings (mark T for true secret, F for false positive):"
detect-secrets audit .secrets.baseline

echo "✅ Staging updated baseline..."
git add .secrets.baseline

echo "🎉 Ready to commit! Run:"
echo "git commit -m 'chore(security): refresh detect-secrets baseline'"
