#!/usr/bin/env bash
# scripts/rollback-forwarding.sh
# One-command rollback to safe point

set -e

echo "🚨 EMERGENCY ROLLBACK - Forwarding System"
echo "=========================================="
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Not in a git repository. Cannot rollback."
  exit 1
fi

# Check if safepoint tag exists
if ! git tag -l | grep -q "safepoint-forwarding-hardening"; then
  echo "❌ Safepoint tag 'safepoint-forwarding-hardening' not found."
  echo "Available tags:"
  git tag -l | grep safepoint || echo "No safepoint tags found."
  exit 1
fi

echo "📍 Current commit: $(git rev-parse --short HEAD)"
echo "🎯 Rolling back to: safepoint-forwarding-hardening"
echo ""

# Confirm rollback
echo "⚠️  This will:"
echo "   - Reset your working directory to the safepoint"
echo "   - Force push to remote (overwrites remote history)"
echo "   - LOSE all commits after the safepoint"
echo ""
echo "Are you sure you want to continue? (yes/no)"
read -r response

if [[ "$response" != "yes" ]]; then
  echo "❌ Rollback cancelled."
  exit 0
fi

echo ""
echo "🔄 Starting rollback..."

# Reset to safepoint
git reset --hard safepoint-forwarding-hardening

# Force push to remote
echo "📤 Force pushing to remote..."
git push --force-with-lease origin HEAD

echo ""
echo "✅ Rollback complete!"
echo ""
echo "📋 What was restored:"
echo "   - Bulletproof status system"
echo "   - Kill-switches and feature flags"
echo "   - BFF guard middleware"
echo "   - Pre-commit safety checks"
echo "   - Regression tests"
echo ""
echo "🔧 Next steps:"
echo "   1. Verify the system is working"
echo "   2. Check logs for any issues"
echo "   3. Re-enable feature flags as needed"
echo ""
echo "🚨 If issues persist, check:"
echo "   - Environment variables"
echo "   - Database constraints"
echo "   - Service dependencies"
