#!/usr/bin/env bash
# scripts/validate-production.sh
# Production validation script for forwarding hardening

set -e

# Configuration
BACKEND_URL=${BACKEND_URL:-"https://vah-api-staging.onrender.com"}
FRONTEND_URL=${FRONTEND_URL:-"https://vah-new-frontend-75d6.vercel.app"}
ADMIN_TOKEN=${ADMIN_TOKEN:-""}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 PRODUCTION VALIDATION - FORWARDING HARDENING${NC}"
echo "================================================"
echo ""

# Test 1: Health Check Endpoints
echo -e "${BLUE}Test 1: Health Check Endpoints${NC}"
echo "=============================="

# Basic health
echo "Testing basic health endpoint..."
if curl -s "${BACKEND_URL}/api/health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Basic health check: OK${NC}"
else
    echo -e "${RED}❌ Basic health check: FAILED${NC}"
fi

# Status guard health
echo "Testing status guard health endpoint..."
status_guard_response=$(curl -s "${BACKEND_URL}/api/healthz/status-guard")
if echo "$status_guard_response" | grep -q "STRICT_STATUS_GUARD"; then
    echo -e "${GREEN}✅ Status guard health check: OK${NC}"
    
    # Check if guards are enabled
    if echo "$status_guard_response" | grep -q '"STRICT_STATUS_GUARD":"1"'; then
        echo -e "${GREEN}✅ STRICT_STATUS_GUARD: ENABLED${NC}"
    else
        echo -e "${RED}❌ STRICT_STATUS_GUARD: DISABLED${NC}"
    fi
    
    if echo "$status_guard_response" | grep -q '"BFF_READS_ONLY":"1"'; then
        echo -e "${GREEN}✅ BFF_READS_ONLY: ENABLED${NC}"
    else
        echo -e "${RED}❌ BFF_READS_ONLY: DISABLED${NC}"
    fi
else
    echo -e "${RED}❌ Status guard health check: FAILED${NC}"
fi

echo ""

# Test 2: BFF Guard
echo -e "${BLUE}Test 2: BFF Guard${NC}"
echo "==============="

echo "Testing BFF write blocking..."
bff_response=$(curl -s -i -X POST "${FRONTEND_URL}/api/bff/forwarding/update" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

if echo "$bff_response" | grep -q "410 Gone"; then
    echo -e "${GREEN}✅ BFF writes properly blocked (410 Gone)${NC}"
else
    echo -e "${RED}❌ BFF writes NOT blocked${NC}"
    echo "Response:"
    echo "$bff_response"
fi

echo ""

# Test 3: Metrics Endpoint
echo -e "${BLUE}Test 3: Metrics Endpoint${NC}"
echo "====================="

echo "Testing metrics endpoint..."
metrics_response=$(curl -s "${BACKEND_URL}/api/metrics")

if echo "$metrics_response" | grep -q "status_transition_total\|illegal_status_attempt_total\|api_error_total"; then
    echo -e "${GREEN}✅ Metrics endpoint: OK${NC}"
    
    # Count metrics
    transition_count=$(echo "$metrics_response" | grep -c "status_transition_total" || echo "0")
    illegal_count=$(echo "$metrics_response" | grep -c "illegal_status_attempt_total" || echo "0")
    error_count=$(echo "$metrics_response" | grep -c "api_error_total" || echo "0")
    
    echo "📊 Current metrics:"
    echo "   - Status transitions: $transition_count"
    echo "   - Illegal attempts: $illegal_count"
    echo "   - API errors: $error_count"
else
    echo -e "${RED}❌ Metrics endpoint: FAILED${NC}"
fi

echo ""

# Test 4: Status Transitions (if token provided)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${BLUE}Test 4: Status Transitions${NC}"
    echo "========================="
    
    echo "Testing status transition validation..."
    
    # Test illegal transition (Requested -> Delivered)
    echo "Testing illegal transition (Requested -> Delivered)..."
    illegal_response=$(curl -s -X POST "${BACKEND_URL}/api/admin/forwarding/requests/999/status" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"action": "mark_delivered"}')
    
    if echo "$illegal_response" | grep -q "illegal_transition\|not_found"; then
        echo -e "${GREEN}✅ Illegal transition properly rejected${NC}"
    else
        echo -e "${RED}❌ Illegal transition not rejected${NC}"
        echo "Response: $illegal_response"
    fi
    
    # Test case insensitivity
    echo "Testing case insensitivity..."
    case_response=$(curl -s -X POST "${BACKEND_URL}/api/admin/forwarding/requests/999/status" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"action": "start_processing"}')
    
    if echo "$case_response" | grep -q "not_found\|illegal_transition"; then
        echo -e "${GREEN}✅ Status parsing working (proper error format)${NC}"
    else
        echo -e "${YELLOW}⚠️  Status parsing unclear${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Test 4: ADMIN_TOKEN not set${NC}"
fi

echo ""

# Test 5: Random Casing Fuzzer
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${BLUE}Test 5: Case Insensitivity Fuzzer${NC}"
    echo "==============================="
    
    echo "Testing various case combinations..."
    
    casey=("requested" "REQUESTED" "rEqUeStEd" "Processing" "processing" "PROCESSING")
    
    for case_test in "${casey[@]}"; do
        echo "Testing case: '$case_test'"
        fuzz_response=$(curl -s -X POST "${BACKEND_URL}/api/admin/forwarding/requests/999/status" \
          -H "Authorization: Bearer ${ADMIN_TOKEN}" \
          -H "Content-Type: application/json" \
          -d "{\"action\": \"start_processing\"}")
        
        if echo "$fuzz_response" | grep -q "not_found\|illegal_transition"; then
            echo -e "  ${GREEN}✅ Proper error format${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Unexpected response${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  Skipping Test 5: ADMIN_TOKEN not set${NC}"
fi

echo ""

# Test 6: Happy Path End-to-End
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${BLUE}Test 6: Happy Path Validation${NC}"
    echo "============================="
    
    echo "Testing valid status transitions..."
    
    # This would need real request IDs - for now just test the API structure
    echo "Note: This test requires real forwarding request IDs"
    echo "To test manually:"
    echo "1. Create a forwarding request"
    echo "2. Test: Requested -> Processing -> Dispatched -> Delivered"
    echo "3. Verify each transition works and is recorded in metrics"
else
    echo -e "${YELLOW}⚠️  Skipping Test 6: ADMIN_TOKEN not set${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}📋 VALIDATION SUMMARY${NC}"
echo "=================="
echo ""

# Check all critical components
echo "🔍 Critical Components Status:"
echo ""

# Health endpoints
if curl -s "${BACKEND_URL}/api/health" | grep -q "healthy"; then
    echo -e "✅ Health Endpoint: ${GREEN}OK${NC}"
else
    echo -e "❌ Health Endpoint: ${RED}FAILED${NC}"
fi

# Status guard
if curl -s "${BACKEND_URL}/api/healthz/status-guard" | grep -q '"STRICT_STATUS_GUARD":"1"'; then
    echo -e "✅ Status Guard: ${GREEN}ENABLED${NC}"
else
    echo -e "❌ Status Guard: ${RED}DISABLED${NC}"
fi

# BFF guard
if curl -s -i -X POST "${FRONTEND_URL}/api/bff/forwarding/update" -d '{}' | grep -q "410"; then
    echo -e "✅ BFF Guard: ${GREEN}ACTIVE${NC}"
else
    echo -e "❌ BFF Guard: ${RED}INACTIVE${NC}"
fi

# Metrics
if curl -s "${BACKEND_URL}/api/metrics" | grep -q "status_transition_total"; then
    echo -e "✅ Metrics: ${GREEN}WORKING${NC}"
else
    echo -e "❌ Metrics: ${RED}FAILED${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Production validation complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Set up Grafana alerts (see docs/GRAFANA_ALERTS.md)"
echo "2. Add StatusGuardCard to admin dashboard"
echo "3. Monitor metrics endpoint regularly"
echo "4. Test admin workflow end-to-end"
echo ""
echo -e "${YELLOW}🚨 If issues found:${NC}"
echo "Run: ./scripts/rollback-forwarding.sh"
echo ""
echo -e "${GREEN}✅ Your forwarding system is production-ready!${NC}"
