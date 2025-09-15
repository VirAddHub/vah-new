#!/bin/bash
set -e

echo "🌱 Seeding database for testing..."

# Ensure data directory exists
mkdir -p data

# Run migrations
echo "📦 Running migrations..."
node scripts/run-sql.cjs scripts/migrate-hardening.sql

# Seed data using existing seed.cjs
echo "👤 Seeding admin user and plans..."
node scripts/seed.cjs

echo "🎉 Database seeded successfully!"
