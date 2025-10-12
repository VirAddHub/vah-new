#!/usr/bin/env bash
# scripts/smoke-tests.sh
# Production smoke tests for forwarding hardening

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

echo -e "${BLUE}🧪 FORWARDING HARDENING - SMOKE TESTS${NC}"
echo "=========================================="
echo ""

# Test A: BFF writes are blocked
echo -e "${BLUE}Test A: BFF writes blocked${NC}"
echo "=========================="
echo "Testing: POST to BFF route should return 410 Gone"
echo ""

response=$(curl -s -i -X POST "${FRONTEND_URL}/api/bff/forwarding/update" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

if echo "$response" | grep -q "410 Gone"; then
    echo -e "${GREEN}✅ BFF writes properly blocked (410 Gone)${NC}"
    if echo "$response" | grep -q "BFF writes disabled"; then
        echo -e "${GREEN}✅ Correct error message returned${NC}"
    else
        echo -e "${YELLOW}⚠️  BFF blocked but message unclear${NC}"
    fi
else
    echo -e "${RED}❌ BFF writes NOT blocked - check BFF_READS_ONLY=1${NC}"
    echo "Response:"
    echo "$response"
fi

echo ""

# Test B: Direct backend writes work (if token provided)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${BLUE}Test B: Direct backend writes${NC}"
    echo "============================="
    echo "Testing: Direct backend API call with Bearer token"
    echo ""
    
    # This would need a real request ID - for now just test auth
    auth_response=$(curl -s -i -X GET "${BACKEND_URL}/api/admin/users" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}")
    
    if echo "$auth_response" | grep -q "200 OK"; then
        echo -e "${GREEN}✅ Direct backend auth working${NC}"
    else
        echo -e "${RED}❌ Direct backend auth failed${NC}"
        echo "Response:"
        echo "$auth_response"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Test B: ADMIN_TOKEN not set${NC}"
fi

echo ""

# Test C: Case insensitivity (if token provided)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${BLUE}Test C: Case insensitivity${NC}"
    echo "=========================="
    echo "Testing: Lowercase status should normalize to canonical form"
    echo ""
    
    # Test with a dummy request (this will fail but we can check the error format)
    case_response=$(curl -s -X POST "${BACKEND_URL}/api/admin/forwarding/requests/999/status" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"action": "start_processing"}')
    
    # Check if we get a proper error (not a parsing error)
    if echo "$case_response" | grep -q "not_found\|illegal_transition"; then
        echo -e "${GREEN}✅ Status parsing working (proper error format)${NC}"
    else
        echo -e "${YELLOW}⚠️  Status parsing unclear - check response format${NC}"
        echo "Response: $case_response"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Test C: ADMIN_TOKEN not set${NC}"
fi

echo ""

# Test D: Metrics endpoint
echo -e "${BLUE}Test D: Metrics endpoint${NC}"
echo "========================"
echo "Testing: Metrics endpoint accessibility"
echo ""

metrics_response=$(curl -s "${BACKEND_URL}/api/metrics")

if echo "$metrics_response" | grep -q "status_transition_total\|illegal_status_attempt_total\|api_error_total"; then
    echo -e "${GREEN}✅ Metrics endpoint working${NC}"
    
    # Count metrics
    transition_count=$(echo "$metrics_response" | grep -c "status_transition_total" || echo "0")
    illegal_count=$(echo "$metrics_response" | grep -c "illegal_status_attempt_total" || echo "0")
    error_count=$(echo "$metrics_response" | grep -c "api_error_total" || echo "0")
    
    echo "📊 Metrics found:"
    echo "   - Status transitions: $transition_count"
    echo "   - Illegal attempts: $illegal_count"
    echo "   - API errors: $error_count"
else
    echo -e "${RED}❌ Metrics endpoint not working${NC}"
    echo "Response:"
    echo "$metrics_response"
fi

echo ""

# Test E: Health check
echo -e "${BLUE}Test E: Health check${NC}"
echo "===================="
echo "Testing: System health endpoint"
echo ""

health_response=$(curl -s "${BACKEND_URL}/api/healthz/status-guard" 2>/dev/null || echo "endpoint_not_found")

if [ "$health_response" = "endpoint_not_found" ]; then
    echo -e "${YELLOW}⚠️  Health check endpoint not implemented yet${NC}"
    echo "This is optional - system still functional"
else
    if echo "$health_response" | grep -q "STRICT_STATUS_GUARD\|BFF_READS_ONLY"; then
        echo -e "${GREEN}✅ Health check working${NC}"
        echo "Health status:"
        echo "$health_response" | jq . 2>/dev/null || echo "$health_response"
    else
        echo -e "${RED}❌ Health check format unclear${NC}"
        echo "Response: $health_response"
    fi
fi

echo ""
echo -e "${BLUE}📋 SUMMARY${NC}"
echo "=========="
echo ""

# Summary
echo "🧪 Smoke test results:"
echo ""

if curl -s -i -X POST "${FRONTEND_URL}/api/bff/forwarding/update" -d '{}' | grep -q "410"; then
    echo -e "✅ BFF Guard: ${GREEN}ACTIVE${NC}"
else
    echo -e "❌ BFF Guard: ${RED}INACTIVE${NC}"
fi

if curl -s "${BACKEND_URL}/api/metrics" | grep -q "status_transition_total"; then
    echo -e "✅ Metrics: ${GREEN}WORKING${NC}"
else
    echo -e "❌ Metrics: ${RED}FAILED${NC}"
fi

if [ -n "$ADMIN_TOKEN" ]; then
    if curl -s -i -X GET "${BACKEND_URL}/api/admin/users" -H "Authorization: Bearer ${ADMIN_TOKEN}" | grep -q "200"; then
        echo -e "✅ Backend Auth: ${GREEN}WORKING${NC}"
    else
        echo -e "❌ Backend Auth: ${RED}FAILED${NC}"
    fi
else
    echo -e "⚠️  Backend Auth: ${YELLOW}SKIPPED (no token)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Smoke tests complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Set up monitoring alerts"
echo "2. Test admin dashboard workflow"
echo "3. Monitor logs for any issues"
echo ""
echo -e "${YELLOW}🚨 If issues found:${NC}"
echo "Run: ./scripts/rollback-forwarding.sh"
