#!/bin/bash

# VirtualAddressHub Production Deployment Script
# This script deploys the application to production

set -e  # Exit on any error

echo "🚀 Starting VirtualAddressHub Production Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is required"
    exit 1
fi

if [ -z "$POSTMARK_API_TOKEN" ]; then
    echo "❌ Error: POSTMARK_API_TOKEN environment variable is required"
    exit 1
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ Error: STRIPE_SECRET_KEY environment variable is required"
    exit 1
fi

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Run type checking
echo "🔍 Running type checking..."
npm run type-check

# Run linting
echo "🧹 Running linting..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm test

# Build the application
echo "🏗️ Building application..."
npm run build

# Initialize database
echo "🗄️ Initializing database..."
npm run db:migrate

# Create backup
echo "💾 Creating database backup..."
npm run db:backup

# Set production environment
export NODE_ENV=production

# Start the application
echo "🚀 Starting production server..."
npm start

echo "✅ VirtualAddressHub Production Deployment Complete!"
echo "🌐 Application is running at: https://virtualaddresshub.co.uk"
echo "📊 Admin panel: https://virtualaddresshub.co.uk/admin/login"
echo "📧 Support: support@virtualaddresshub.co.uk"
