#!/bin/bash

# Script to create admin and worker users in Postgres
# Usage: ./create-users.sh [DATABASE_URL]

if [ -z "$1" ]; then
    echo "❌ Please provide DATABASE_URL as argument"
    echo "Usage: ./create-users.sh 'postgresql://user:pass@host:port/dbname'"
    echo "Or set DATABASE_URL environment variable and run: DATABASE_URL='...' ./create-users.sh"
    exit 1
fi

DATABASE_URL="$1"

echo "🚀 Creating admin and worker users in Postgres..."
echo "Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"

# Run the SQL script
psql "$DATABASE_URL" -f "$(dirname "$0")/create-users-direct.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Users created successfully!"
    echo ""
    echo "📋 User credentials:"
    echo "Admin: admin@yourdomain.com / CHANGE_ME_AFTER_FIRST_LOGIN"
    echo "Worker: worker@yourdomain.com / CHANGE_ME_AFTER_FIRST_LOGIN"
else
    echo "❌ Failed to create users"
    exit 1
fi
