#!/bin/bash
# Complete API Testing Script - Starts mock server and runs tests

set -e

echo "🧪 Comprehensive API Testing with Mock Server"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Start mock server in background
echo -e "${BLUE}Starting mock API server...${NC}"
node apps/backend/test-api-mock-server.js &
MOCK_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if ! kill -0 $MOCK_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start mock server${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Mock server started (PID: $MOCK_PID)${NC}"
echo ""

# Run tests
echo -e "${BLUE}Running API tests...${NC}"
MOCK_API_URL=http://localhost:3002 node apps/backend/test-all-apis-mock.js
TEST_RESULT=$?

# Cleanup
echo ""
echo -e "${YELLOW}Stopping mock server...${NC}"
kill $MOCK_PID 2>/dev/null || true
wait $MOCK_PID 2>/dev/null || true

echo -e "${GREEN}✅ Mock server stopped${NC}"
echo ""

# Exit with test result
exit $TEST_RESULT

