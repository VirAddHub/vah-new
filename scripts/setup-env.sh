#!/bin/bash
# Environment setup script for VirtualAddressHub

set -e

echo "🔐 VirtualAddressHub Environment Setup"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Environment Setup Options:"
echo "1. Production (Render) - Set environment variables in Render dashboard"
echo "2. Local Development - Create .env.local files"
echo "3. CI/CD - Use GitHub Secrets or similar"
echo ""

read -p "Choose setup type (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Production Setup (Render)"
        echo "============================"
        echo ""
        echo "Set these environment variables in your Render dashboard:"
        echo ""
        echo "Backend Service (vah-api):"
        echo "- NODE_ENV=production"
        echo "- APP_ENV=production"
        echo "- DATA_DIR=/var/data"
        echo "- INVOICES_DIR=/var/data/invoices"
        echo "- BACKUPS_DIR=/var/data/backups"
        echo "- APP_ORIGIN=https://www.virtualaddresshub.co.uk"
        echo "- BACKEND_API_ORIGIN=https://api.virtualaddresshub.co.uk/api"
        echo "- POSTMARK_API_TOKEN=your_real_token"
        echo "- POSTMARK_FROM=no-reply@virtualaddresshub.co.uk"
        echo "- COOKIE_SECRET=your_real_secret"
        echo "- GO_CARDLESS_SECRET=your_real_secret"
        echo "- SUMSUB_SECRET=your_real_secret"
        echo "- COMPANIES_HOUSE_API_KEY=your_real_key"
        echo "- ADDRESS_API_KEY=your_real_key"
        echo ""
        echo "Frontend Service (vah-web):"
        echo "- NEXT_PUBLIC_BASE_URL=https://www.virtualaddresshub.co.uk"
        echo "- BACKEND_API_ORIGIN=https://api.virtualaddresshub.co.uk/api"
        echo ""
        echo "✅ Production setup complete!"
        ;;
    2)
        echo ""
        echo "💻 Local Development Setup"
        echo "=========================="
        echo ""
        
        # Create server .env.local
        if [ ! -f "server/.env.local" ]; then
            echo "Creating server/.env.local..."
            cp server/env.example server/.env.local
            echo "✅ Created server/.env.local"
            echo "⚠️  Please update server/.env.local with your actual values"
        else
            echo "⚠️  server/.env.local already exists"
        fi
        
        # Create app .env.local
        if [ ! -f "app/.env.local" ]; then
            echo "Creating app/.env.local..."
            cp app/env.example app/.env.local
            echo "✅ Created app/.env.local"
            echo "⚠️  Please update app/.env.local with your actual values"
        else
            echo "⚠️  app/.env.local already exists"
        fi
        
        echo ""
        echo "✅ Local development setup complete!"
        echo "⚠️  Remember to update the .env.local files with real values"
        ;;
    3)
        echo ""
        echo "🔄 CI/CD Setup"
        echo "=============="
        echo ""
        echo "For GitHub Actions, add these secrets to your repository:"
        echo ""
        echo "Required Secrets:"
        echo "- COMPANIES_HOUSE_API_KEY"
        echo "- POSTMARK_API_TOKEN"
        echo "- COOKIE_SECRET"
        echo "- GO_CARDLESS_SECRET"
        echo "- SUMSUB_SECRET"
        echo "- ADDRESS_API_KEY"
        echo ""
        echo "Optional Secrets:"
        echo "- BACKUPS_DIR"
        echo "- INVOICE_LINK_TTL_USER_MIN"
        echo "- INVOICE_LINK_TTL_ADMIN_MIN"
        echo ""
        echo "✅ CI/CD setup complete!"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and choose 1-3."
        exit 1
        ;;
esac

echo ""
echo "🔒 Security Reminders:"
echo "- Never commit .env files with real values"
echo "- Rotate keys immediately if exposed"
echo "- Use different keys for different environments"
echo "- Monitor for exposed secrets in git history"
echo ""
echo "📚 See SECURITY.md for detailed security guidelines"
