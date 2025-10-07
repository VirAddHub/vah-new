#!/usr/bin/env bash
set -euo pipefail

echo "🔄 Running forwarding system migrations from Render service..."

# Get the database URL from environment variables
if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    exit 1
fi

echo "📋 Migration 025: Forwarding charges..."
psql "$DATABASE_URL" -f /opt/render/project/src/apps/backend/migrations/025_forwarding_charges.sql

echo "📋 Migration 026: Enhanced forwarding system..."
psql "$DATABASE_URL" -f /opt/render/project/src/apps/backend/migrations/026_enhanced_forwarding_system.sql

echo "📋 Migration 027: Admin forwarding system..."
psql "$DATABASE_URL" -f /opt/render/project/src/apps/backend/migrations/027_admin_forwarding_system.sql

echo "📋 Migration 028: Forwarding performance indexes..."
psql "$DATABASE_URL" -f /opt/render/project/src/apps/backend/migrations/028_forwarding_perf.sql

echo "📋 Migration 029: Forwarding trigger..."
psql "$DATABASE_URL" -f /opt/render/project/src/apps/backend/migrations/029_forwarding_trigger.sql

echo "✅ All forwarding migrations completed successfully!"
