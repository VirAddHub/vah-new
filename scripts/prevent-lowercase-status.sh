#!/usr/bin/env bash
# scripts/prevent-lowercase-status.sh
# Pre-commit safety net to prevent lowercase status literals

set -e

echo "🔍 Checking for lowercase status literals..."

# Check for lowercase status literals in staged changes
if git diff --cached -U0 | grep -E "\+(.*'requested'|'processing'|'dispatched'|'delivered')" >/dev/null; then
  echo "❌ Found lowercase status literals in staged changes!"
  echo ""
  echo "🚨 VIOLATION: Use MAIL_STATUS.* constants instead of hardcoded strings"
  echo ""
  echo "❌ Bad:"
  echo "   if (status === 'requested')"
  echo "   status: 'processing'"
  echo ""
  echo "✅ Good:"
  echo "   if (status === MAIL_STATUS.Requested)"
  echo "   status: MAIL_STATUS.Processing"
  echo ""
  echo "📝 Import the constants:"
  echo "   import { MAIL_STATUS } from '@/lib/mailStatus';"
  echo ""
  echo "🔧 Fix the violations and try again."
  exit 1
fi

# Check for uppercase status literals (should also use constants)
if git diff --cached -U0 | grep -E "\+(.*'Requested'|'Processing'|'Dispatched'|'Delivered')" >/dev/null; then
  echo "⚠️  Found uppercase status literals in staged changes!"
  echo ""
  echo "💡 RECOMMENDATION: Use MAIL_STATUS.* constants for consistency"
  echo ""
  echo "❌ Consider changing:"
  echo "   if (status === 'Requested')"
  echo ""
  echo "✅ To:"
  echo "   if (status === MAIL_STATUS.Requested)"
  echo ""
  echo "This prevents case mismatch bugs and ensures consistency."
  echo ""
  echo "Continue anyway? (y/N)"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "❌ Commit blocked. Fix the violations and try again."
    exit 1
  fi
fi

echo "✅ No lowercase status literals found. Commit allowed."
