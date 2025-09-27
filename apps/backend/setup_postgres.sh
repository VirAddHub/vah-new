#!/bin/bash

# PostgreSQL Schema Setup Script for Virtual Address Hub
# This script helps you set up your PostgreSQL database

set -e

echo "🚀 Setting up PostgreSQL schema for Virtual Address Hub..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set."
    echo "Please set it to your PostgreSQL connection string, e.g.:"
    echo "export DATABASE_URL='postgresql://username:password@localhost:5432/database_name'"
    exit 1
fi

echo "📊 Using database: $DATABASE_URL"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Test database connection
echo "🔍 Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to database. Please check your DATABASE_URL."
    exit 1
fi

echo "✅ Database connection successful!"

# Run the schema creation
echo "📝 Creating database schema..."
psql "$DATABASE_URL" -f create_postgres_schema.sql

echo "🎉 Schema creation completed successfully!"
echo ""
echo "📋 What was created:"
echo "  • User management tables (user, password_reset)"
echo "  • Mail processing tables (mail_item, scan_tokens, mail_event)"
echo "  • Address management (location, address_slot)"
echo "  • Billing system (invoice, invoice_token, plans, payment)"
echo "  • Logging & audit (admin_log, activity_log, audit_log, webhook_log)"
echo "  • Export system (export_job)"
echo "  • Default subscription plans (Basic, Professional, Business)"
echo ""
echo "🔧 Next steps:"
echo "  1. Update your application's DATABASE_URL environment variable"
echo "  2. Set DB_CLIENT=pg in your environment"
echo "  3. Start your application - it should now use PostgreSQL!"
echo ""
echo "✨ Your PostgreSQL database is ready to use!"
