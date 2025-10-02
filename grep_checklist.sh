#!/bin/bash
# Grep checklist for time standardization issues
# Run this after applying code fixes to find remaining problems

echo "🔍 Time Standardization Grep Checklist"
echo "======================================"

echo ""
echo "=== Checking for risky NOW() inserts into BIGINT columns ==="
rg -n "INSERT INTO.*created_at.*NOW\(\)" apps/backend/src --type ts || echo "✅ No risky NOW() inserts found"

echo ""
echo "=== Checking for date comparisons mixing types ==="
rg -n "WHERE.*_at.*NOW\(\)" apps/backend/src --type ts || echo "✅ No mixed type comparisons found"

echo ""
echo "=== Checking for INTERVAL usage (should use millisecond math) ==="
rg -n "INTERVAL" apps/backend/src --type ts || echo "✅ No INTERVAL usage found"

echo ""
echo "=== Checking for legacy column usage in plans (should use *_ms) ==="
rg -n "plans\.created_at[^_]" apps/backend/src --type ts || echo "✅ No legacy plans column usage found"
rg -n "plans\.updated_at[^_]" apps/backend/src --type ts || echo "✅ No legacy plans column usage found"

echo ""
echo "=== Checking for seconds instead of milliseconds ==="
rg -n "Date\.now\(\).*1000" apps/backend/src --type ts || echo "✅ No seconds-based timestamps found"
rg -n "getTime\(\).*1000" apps/backend/src --type ts || echo "✅ No seconds-based timestamps found"

echo ""
echo "=== Checking for EXTRACT(EPOCH) without millisecond conversion ==="
rg -n "EXTRACT\(EPOCH FROM.*\)(?!\s*\*\s*1000)" apps/backend --type sql || echo "✅ All EPOCH extractions properly convert to milliseconds"

echo ""
echo "=== Checking for webhook timestamp handling ==="
rg -n "webhook_log" apps/backend/src --type ts || echo "✅ No webhook_log references found"

echo ""
echo "=== Checking for admin_audit usage ==="
rg -n "admin_audit" apps/backend/src --type ts || echo "✅ No admin_audit references found"

echo ""
echo "🎉 Grep checklist completed!"
echo "If any issues were found above, review and fix them before deploying."
