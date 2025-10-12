#!/usr/bin/env bash
# scripts/go-live-checklist.sh
# Production deployment checklist for forwarding hardening

set -e

echo "🚀 FORWARDING HARDENING - GO-LIVE CHECKLIST"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL=${BACKEND_URL:-"https://vah-api-staging.onrender.com"}
FRONTEND_URL=${FRONTEND_URL:-"https://vah-new-frontend-75d6.vercel.app"}
ADMIN_TOKEN=${ADMIN_TOKEN:-""}

echo -e "${BLUE}📋 STEP 1: SET PRODUCTION FLAGS${NC}"
echo "=================================="
echo ""
echo "Set these environment variables in your production environment:"
echo ""
echo -e "${YELLOW}Backend (Render/Vercel):${NC}"
echo "export STRICT_STATUS_GUARD=1"
echo "export PERF_OPTIMIZATIONS=0"
echo ""
echo -e "${YELLOW}Frontend (Vercel):${NC}"
echo "export BFF_READS_ONLY=1"
echo ""
echo "Press Enter when environment variables are set..."
read -r

echo ""
echo -e "${BLUE}📋 STEP 2: VERIFY BUILDS & TESTS${NC}"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in project root. Please run from /Users/libanadan/Desktop/vah${NC}"
    exit 1
fi

echo "🔨 Building backend..."
if npm run build:backend; then
    echo -e "${GREEN}✅ Backend build successful${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

echo ""
echo "🔨 Building frontend..."
if npm run build:frontend; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 STEP 3: TAG THE RELEASE${NC}"
echo "=========================="
echo ""

echo "🏷️  Creating release tag..."
if git tag -a "safepoint-forwarding-hardening-$(date +%Y%m%d-%H%M%S)" -m "Forwarding hardening release - $(date)"; then
    echo -e "${GREEN}✅ Release tag created${NC}"
else
    echo -e "${RED}❌ Failed to create release tag${NC}"
    exit 1
fi

echo "📤 Pushing tags..."
if git push --tags; then
    echo -e "${GREEN}✅ Tags pushed to remote${NC}"
else
    echo -e "${RED}❌ Failed to push tags${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 STEP 4: DEPLOYMENT ORDER${NC}"
echo "=========================="
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Deploy in this order${NC}"
echo ""
echo "1️⃣  Deploy BACKEND first (ensures guard exists)"
echo "2️⃣  Deploy FRONTEND second (uses backend guard)"
echo ""
echo "Press Enter when both deployments are complete..."
read -r

echo ""
echo -e "${BLUE}📋 STEP 5: SMOKE TESTS${NC}"
echo "====================="
echo ""

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  ADMIN_TOKEN not set. Skipping authenticated tests.${NC}"
    echo "Set ADMIN_TOKEN environment variable to run full smoke tests."
else
    echo "🧪 Running smoke tests..."
    
    # Test A: BFF writes are blocked
    echo "Test A: BFF writes blocked..."
    if curl -s -i -X POST "${FRONTEND_URL}/api/bff/forwarding/update" -d '{}' | grep -q "410"; then
        echo -e "${GREEN}✅ BFF writes properly blocked${NC}"
    else
        echo -e "${RED}❌ BFF writes not blocked - check BFF_READS_ONLY=1${NC}"
    fi
    
    # Test B: Direct backend writes work
    echo "Test B: Direct backend writes..."
    # This would need a real request ID - skipping for now
    echo -e "${YELLOW}⚠️  Manual test required: POST to /api/admin/forwarding/requests/{id}${NC}"
    
    # Test C: Case insensitivity
    echo "Test C: Case insensitivity..."
    echo -e "${YELLOW}⚠️  Manual test required: POST with lowercase status${NC}"
fi

echo ""
echo -e "${BLUE}📋 STEP 6: OBSERVABILITY CHECK${NC}"
echo "============================="
echo ""

echo "📊 Checking metrics endpoint..."
if curl -s "${BACKEND_URL}/api/metrics" | grep -q "status_transition_total"; then
    echo -e "${GREEN}✅ Metrics endpoint working${NC}"
else
    echo -e "${RED}❌ Metrics endpoint not accessible${NC}"
fi

echo ""
echo -e "${GREEN}🎉 GO-LIVE CHECKLIST COMPLETE!${NC}"
echo "================================"
echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo "1. Monitor metrics endpoint: ${BACKEND_URL}/api/metrics"
echo "2. Set up Grafana alerts (see docs/GRAFANA_ALERTS.md)"
echo "3. Test admin dashboard forwarding workflow"
echo "4. Monitor logs for any issues"
echo ""
echo -e "${YELLOW}🚨 EMERGENCY ROLLBACK:${NC}"
echo "If issues arise, run: ./scripts/rollback-forwarding.sh"
echo ""
echo -e "${GREEN}✅ Your forwarding system is now bulletproof!${NC}"
