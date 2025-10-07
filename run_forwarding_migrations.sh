#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL}"

echo "🔄 Running forwarding system migrations..."

echo "📋 Migration 025: Forwarding charges..."
psql "$DATABASE_URL" -f apps/backend/migrations/025_forwarding_charges.sql

echo "📋 Migration 026: Enhanced forwarding system..."
psql "$DATABASE_URL" -f apps/backend/migrations/026_enhanced_forwarding_system.sql

echo "📋 Migration 027: Admin forwarding system..."
psql "$DATABASE_URL" -f apps/backend/migrations/027_admin_forwarding_system.sql

echo "📋 Migration 028: Forwarding performance indexes..."
psql "$DATABASE_URL" -f apps/backend/migrations/028_forwarding_perf.sql

echo "📋 Migration 029: Forwarding trigger..."
psql "$DATABASE_URL" -f apps/backend/migrations/029_forwarding_trigger.sql

echo "✅ All forwarding migrations completed successfully!"
