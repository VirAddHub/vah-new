#!/bin/bash

# OneDrive Graph API Test Commands
# Based on the instructions provided

echo "🔧 OneDrive Graph API Test Commands"
echo "===================================="
echo ""

# Load environment variables
if [ -f "./apps/backend/.env" ]; then
    source ./apps/backend/.env
    echo "✅ Environment variables loaded from apps/backend/.env"
else
    echo "❌ Environment file not found: apps/backend/.env"
    echo "Please ensure your environment variables are set:"
    echo "  GRAPH_TENANT_ID"
    echo "  GRAPH_CLIENT_ID" 
    echo "  GRAPH_CLIENT_SECRET"
    echo ""
    exit 1
fi

# Check required variables
if [ -z "$GRAPH_TENANT_ID" ] || [ -z "$GRAPH_CLIENT_ID" ] || [ -z "$GRAPH_CLIENT_SECRET" ]; then
    echo "❌ Missing required environment variables"
    echo "GRAPH_TENANT_ID: ${GRAPH_TENANT_ID:+SET}"
    echo "GRAPH_CLIENT_ID: ${GRAPH_CLIENT_ID:+SET}"
    echo "GRAPH_CLIENT_SECRET: ${GRAPH_CLIENT_SECRET:+SET}"
    exit 1
fi

echo "📋 Configuration:"
echo "  Tenant ID: $GRAPH_TENANT_ID"
echo "  Client ID: $GRAPH_CLIENT_ID"
echo "  Site Path: $GRAPH_SITE_PATH"
echo ""

# Extract UPN from site path (improved version for multi-part domains)
if [ -n "$GRAPH_SITE_PATH" ]; then
    # Extract alias from /personal/ops_virtualaddresshub_co_uk
    ALIAS=$(echo "$GRAPH_SITE_PATH" | sed 's|^/personal/||')
    # Split on underscores and reconstruct domain
    IFS='_' read -ra PARTS <<< "$ALIAS"
    USER="${PARTS[0]}"
    DOMAIN=$(IFS='.'; echo "${PARTS[*]:1}")
    UPN="${USER}@${DOMAIN}"
else
    UPN="ops@virtualaddresshub.co.uk"
fi
echo "📧 UPN: $UPN"
echo ""

echo "🔑 Test 1: Token Generation"
echo "---------------------------"
echo "Command: curl -s -D - -X POST \"https://login.microsoftonline.com/$GRAPH_TENANT_ID/oauth2/v2.0/token\" \\"
echo "  -H \"Content-Type: application/x-www-form-urlencoded\" \\"
echo "  -d \"client_id=$GRAPH_CLIENT_ID&client_secret=$GRAPH_CLIENT_SECRET&grant_type=client_credentials&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default\""
echo ""

# Test token generation
TOKEN_RESPONSE=$(curl -s -D - -X POST "https://login.microsoftonline.com/$GRAPH_TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$GRAPH_CLIENT_ID&client_secret=$GRAPH_CLIENT_SECRET&grant_type=client_credentials&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default")

echo "Response:"
echo "$TOKEN_RESPONSE"
echo ""

# Extract access token from response
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ACCESS_TOKEN" ]; then
    echo "✅ Token extracted successfully"
    echo "Token preview: ${ACCESS_TOKEN:0:20}..."
    echo ""
    
    echo "📁 Test 2: OneDrive File Access"
    echo "-------------------------------"
    DRIVE_PATH="Documents/Scanned_Mail/user4_1111_bilan.pdf"
    echo "File path: $DRIVE_PATH"
    echo "Command: curl -i -H \"Authorization: Bearer \$ACCESS_TOKEN\" \\"
    echo "  \"https://graph.microsoft.com/v1.0/users/$UPN/drive/root:/$DRIVE_PATH:/content\""
    echo ""
    
    # Test file access
    FILE_RESPONSE=$(curl -i -H "Authorization: Bearer $ACCESS_TOKEN" \
      "https://graph.microsoft.com/v1.0/users/$UPN/drive/root:/$DRIVE_PATH:/content" 2>/dev/null)
    
    echo "Response:"
    echo "$FILE_RESPONSE"
    echo ""
    
    # Check if we got a successful response
    if echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 200\|HTTP/2 200"; then
        echo "✅ File access successful!"
    elif echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 302\|HTTP/2 302\|HTTP/1.1 307\|HTTP/2 307"; then
        echo "✅ File access successful (redirect to download URL)!"
    elif echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 404\|HTTP/2 404"; then
        echo "⚠️  File not found (404) - this might be expected if the file doesn't exist"
    elif echo "$FILE_RESPONSE" | grep -q "HTTP/1.1 403\|HTTP/2 403"; then
        echo "❌ Access denied (403) - check permissions"
    else
        echo "❌ File access failed - check the response above"
    fi
    
else
    echo "❌ Failed to extract access token from response"
    echo "Check your credentials and permissions"
fi

echo ""
echo "🎯 Summary"
echo "=========="
echo "If you see successful responses above, your OneDrive integration is working!"
echo ""
echo "Next steps:"
echo "1. Ensure Files.Read.All permission is granted with admin consent"
echo "2. Test with your actual file paths"
echo "3. The updated code in apps/backend/src/services/sharepoint.ts will now use the correct OneDrive endpoint"
