#!/bin/bash
# Run admin activity tables migration

echo "Creating admin activity tables..."

# Use the DATABASE_URL from environment
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not set"
    exit 1
fi

# Run the migration
psql "$DATABASE_URL" -f migrations/023_create_admin_activity_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Admin activity tables created successfully"
else
    echo "❌ Failed to create admin activity tables"
    exit 1
fi
