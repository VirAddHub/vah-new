#!/bin/bash
# Comprehensive API Mock Testing Script Runner

set -e

echo "🧪 Comprehensive API Mock Testing"
echo "=================================="
echo ""

# Check if backend is running
BACKEND_URL="${BACKEND_API_ORIGIN:-http://localhost:3001}"
echo "Testing against: $BACKEND_URL"
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Run the test script
node apps/backend/test-all-apis-mock.js

