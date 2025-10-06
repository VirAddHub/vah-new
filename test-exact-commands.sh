#!/bin/bash

# Test the exact commands from the checklist
# This script tests the specific curl commands provided

echo "🧪 Testing Exact Commands from Checklist"
echo "========================================"
echo ""

# Load environment variables
if [ -f "./apps/backend/.env" ]; then
    source ./apps/backend/.env
    echo "✅ Environment variables loaded"
else
    echo "❌ No .env file found. Please set these variables:"
    echo "   export GRAPH_TENANT_ID='your-tenant-id'"
    echo "   export GRAPH_CLIENT_ID='your-client-id'"
    echo "   export GRAPH_CLIENT_SECRET='your-client-secret'"  # pragma: allowlist secret
    echo "   export GRAPH_SITE_HOST='virtualaddresshubcouk-my.sharepoint.com'"
    echo "   export GRAPH_SITE_PATH='/personal/ops_virtualaddresshub_co_uk'"
    exit 1
fi

# Check required variables
if [ -z "$GRAPH_TENANT_ID" ] || [ -z "$GRAPH_CLIENT_ID" ] || [ -z "$GRAPH_CLIENT_SECRET" ]; then
    echo "❌ Missing required environment variables"
    exit 1
fi

echo "📋 Configuration:"
echo "   Tenant ID: ${GRAPH_TENANT_ID:0:8}..."
echo "   Client ID: ${GRAPH_CLIENT_ID:0:8}..."
echo "   Site Path: $GRAPH_SITE_PATH"
echo ""

# Step 2: Token test (exact command from checklist)
echo "🔑 Step 2: Token Test"
echo "--------------------"
echo "Command:"
echo "curl -s -D - -X POST \"https://login.microsoftonline.com/\$TENANT/oauth2/v2.0/token\" \\"
echo "  -H \"Content-Type: application/x-www-form-urlencoded\" \\"
echo "  -d \"client_id=\$CLIENT&client_secret=\$SECRET&grant_type=client_credentials&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default\""
echo ""

TENANT="$GRAPH_TENANT_ID"
CLIENT="$GRAPH_CLIENT_ID"
SECRET="$GRAPH_CLIENT_SECRET"

echo "Executing..."
TOKEN_RESPONSE=$(curl -s -D - -X POST "https://login.microsoftonline.com/$TENANT/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT&client_secret=$SECRET&grant_type=client_credentials&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default")

echo "Response:"
echo "$TOKEN_RESPONSE"
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ACCESS_TOKEN" ]; then
    echo "✅ Token extracted successfully"
    echo "Token preview: ${ACCESS_TOKEN:0:20}..."
    echo ""
    
    # Step 3: Direct Graph content test (exact command from checklist)
    echo "📁 Step 3: Direct Graph Content Test"
    echo "------------------------------------"
    
    UPN="ops@virtualaddresshub.co.uk"
    DRIVE_PATH="Documents/Scanned_Mail/user4_1111_bilan.pdf"
    
    echo "Command:"
    echo "curl -i -H \"Authorization: Bearer \$ACCESS_TOKEN\" \\"
    echo "  \"https://graph.microsoft.com/v1.0/users/\$UPN/drive/root:/\$DRIVE_PATH:/content\""
    echo ""
    echo "UPN: $UPN"
    echo "Drive Path: $DRIVE_PATH"
    echo ""
    
    echo "Executing..."
    FILE_RESPONSE=$(curl -i -H "Authorization: Bearer $ACCESS_TOKEN" \
      "https://graph.microsoft.com/v1.0/users/$UPN/drive/root:/$DRIVE_PATH:/content" 2>/dev/null)
    
    echo "Response:"
    echo "$FILE_RESPONSE"
    echo ""
    
    # Analyze response
    if echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 200\|HTTP/2 200"; then
        echo "✅ File access successful (200 OK)"
    elif echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 302\|HTTP/2 302\|HTTP/1.1 307\|HTTP/2 307"; then
        echo "✅ File access successful (redirect to download URL)"
    elif echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 404\|HTTP/2 404"; then
        echo "⚠️  File not found (404) - this might be expected if the file doesn't exist"
    elif echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 403\|HTTP/2 403"; then
        echo "❌ Access denied (403) - check Files.Read.All permission and admin consent"
    else
        echo "❌ Unexpected response - check the output above"
    fi
    
else
    echo "❌ Failed to extract access token"
    echo "Check your credentials and permissions"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. If token test passed but file test failed with 404, try a different file path"
echo "2. If file test failed with 403, ensure Files.Read.All has admin consent"
echo "3. If both passed, your OneDrive integration is working!"
echo "4. Test your app endpoint: curl -I 'https://vah-api-staging.onrender.com/api/mail-items/25/download'"
