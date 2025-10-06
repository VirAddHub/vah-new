#!/bin/bash

# OneDrive Graph API Verification Checklist
# Run this script to verify your OneDrive integration step by step

echo "🔍 OneDrive Graph API Verification Checklist"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Step 1: Check environment variables
echo "1️⃣  Checking Environment Variables"
echo "-----------------------------------"

# Load environment variables if .env exists
if [ -f "./apps/backend/.env" ]; then
    source ./apps/backend/.env
    print_status 0 "Environment file found"
else
    print_warning "No .env file found. Please ensure these variables are set:"
    echo "   GRAPH_TENANT_ID"
    echo "   GRAPH_CLIENT_ID" 
    echo "   GRAPH_CLIENT_SECRET"
    echo "   GRAPH_SITE_HOST"
    echo "   GRAPH_SITE_PATH"
    echo ""
    echo "You can set them manually:"
    echo "export GRAPH_TENANT_ID='your-tenant-id'"
    echo "export GRAPH_CLIENT_ID='your-client-id'"
    echo "export GRAPH_CLIENT_SECRET='your-client-secret'"  # pragma: allowlist secret
    echo "export GRAPH_SITE_HOST='virtualaddresshubcouk-my.sharepoint.com'"
    echo "export GRAPH_SITE_PATH='/personal/ops_virtualaddresshub_co_uk'"
    echo ""
fi

# Check if variables are set
MISSING_VARS=()
[ -z "$GRAPH_TENANT_ID" ] && MISSING_VARS+=("GRAPH_TENANT_ID")
[ -z "$GRAPH_CLIENT_ID" ] && MISSING_VARS+=("GRAPH_CLIENT_ID")
[ -z "$GRAPH_CLIENT_SECRET" ] && MISSING_VARS+=("GRAPH_CLIENT_SECRET")
[ -z "$GRAPH_SITE_HOST" ] && MISSING_VARS+=("GRAPH_SITE_HOST")
[ -z "$GRAPH_SITE_PATH" ] && MISSING_VARS+=("GRAPH_SITE_PATH")

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    print_status 0 "All required environment variables are set"
    echo "   Tenant ID: ${GRAPH_TENANT_ID:0:8}..."
    echo "   Client ID: ${GRAPH_CLIENT_ID:0:8}..."
    echo "   Site Host: $GRAPH_SITE_HOST"
    echo "   Site Path: $GRAPH_SITE_PATH"
else
    print_status 1 "Missing variables: ${MISSING_VARS[*]}"
    echo "Please set the missing variables and run this script again."
    exit 1
fi

echo ""

# Step 2: Test token generation
echo "2️⃣  Testing Token Generation"
echo "-----------------------------"

print_info "Testing Graph API token generation..."

TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://login.microsoftonline.com/$GRAPH_TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$GRAPH_CLIENT_ID&client_secret=$GRAPH_CLIENT_SECRET&grant_type=client_credentials&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default" 2>/dev/null)

HTTP_CODE=$(echo "$TOKEN_RESPONSE" | tail -n1)
TOKEN_BODY=$(echo "$TOKEN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Token generation successful"
    ACCESS_TOKEN=$(echo "$TOKEN_BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$ACCESS_TOKEN" ]; then
        print_status 0 "Access token extracted"
        echo "   Token preview: ${ACCESS_TOKEN:0:20}..."
    else
        print_status 1 "Failed to extract access token from response"
        echo "Response: $TOKEN_BODY"
    fi
else
    print_status 1 "Token generation failed (HTTP $HTTP_CODE)"
    echo "Response: $TOKEN_BODY"
    echo ""
    echo "Common fixes:"
    echo "   - Check GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET"
    echo "   - Ensure client secret is the 'Value' not the 'Secret ID'"
    echo "   - Verify the app registration exists and is active"
    exit 1
fi

echo ""

# Step 3: Test UPN extraction
echo "3️⃣  Testing UPN Extraction"
echo "---------------------------"

# Extract UPN from site path
if [ -n "$GRAPH_SITE_PATH" ]; then
    ALIAS=$(echo "$GRAPH_SITE_PATH" | sed 's|^/personal/||')
    IFS='_' read -ra PARTS <<< "$ALIAS"
    USER="${PARTS[0]}"
    DOMAIN=$(IFS='.'; echo "${PARTS[*]:1}")
    UPN="${USER}@${DOMAIN}"
    
    print_status 0 "UPN extraction successful"
    echo "   Site Path: $GRAPH_SITE_PATH"
    echo "   Extracted UPN: $UPN"
else
    print_status 1 "GRAPH_SITE_PATH not set"
    exit 1
fi

echo ""

# Step 4: Test OneDrive file access
echo "4️⃣  Testing OneDrive File Access"
echo "---------------------------------"

if [ -z "$ACCESS_TOKEN" ]; then
    print_status 1 "No access token available for file access test"
    exit 1
fi

# Test with a common file path
DRIVE_PATH="Documents/Scanned_Mail/user4_1111_bilan.pdf"
print_info "Testing file access with path: $DRIVE_PATH"

FILE_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/users/$UPN/drive/root:/$DRIVE_PATH:/content" 2>/dev/null)

FILE_HTTP_CODE=$(echo "$FILE_RESPONSE" | tail -n1)
FILE_BODY=$(echo "$FILE_RESPONSE" | head -n -1)

case "$FILE_HTTP_CODE" in
    200)
        print_status 0 "File access successful (200 OK)"
        print_info "File exists and is accessible"
        ;;
    302|307)
        print_status 0 "File access successful (redirect)"
        print_info "Graph redirected to download URL - this is normal"
        ;;
    404)
        print_warning "File not found (404)"
        echo "   This might be expected if the file doesn't exist"
        echo "   Try with a different file path or create a test file"
        ;;
    403)
        print_status 1 "Access denied (403)"
        echo "   Check that Files.Read.All permission is granted with admin consent"
        echo "   Response: $FILE_BODY"
        ;;
    400)
        print_status 1 "Bad request (400)"
        echo "   Check URL format and path encoding"
        echo "   Response: $FILE_BODY"
        ;;
    *)
        print_status 1 "Unexpected response (HTTP $FILE_HTTP_CODE)"
        echo "   Response: $FILE_BODY"
        ;;
esac

echo ""

# Step 5: Test alternative file paths
echo "5️⃣  Testing Alternative File Paths"
echo "-----------------------------------"

ALTERNATIVE_PATHS=(
    "Documents/Scanned_Mail/"
    "Documents/"
    "Scanned_Mail/"
)

for path in "${ALTERNATIVE_PATHS[@]}"; do
    print_info "Testing: $path"
    ALT_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" \
      "https://graph.microsoft.com/v1.0/users/$UPN/drive/root:/$path" 2>/dev/null)
    
    ALT_HTTP_CODE=$(echo "$ALT_RESPONSE" | tail -n1)
    case "$ALT_HTTP_CODE" in
        200|302|307) print_status 0 "  ✅ $path - Accessible" ;;
        404) print_warning "  ⚠️  $path - Not found" ;;
        403) print_status 1 "  ❌ $path - Access denied" ;;
        *) print_status 1 "  ❌ $path - HTTP $ALT_HTTP_CODE" ;;
    esac
done

echo ""

# Step 6: Summary and next steps
echo "6️⃣  Summary and Next Steps"
echo "============================"

if [ "$HTTP_CODE" = "200" ] && [ "$FILE_HTTP_CODE" = "200" ] || [ "$FILE_HTTP_CODE" = "302" ] || [ "$FILE_HTTP_CODE" = "307" ]; then
    print_status 0 "OneDrive integration is working correctly!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy the updated code to production"
    echo "2. Test with your actual file paths"
    echo "3. Monitor logs for any issues"
    echo ""
    echo "Your app will now use the correct OneDrive endpoint:"
    echo "   https://graph.microsoft.com/v1.0/users/$UPN/drive/root:/..."
else
    print_warning "Some tests failed. Please check the issues above."
    echo ""
    echo "Common solutions:"
    echo "1. Ensure Files.Read.All permission is granted with admin consent"
    echo "2. Verify your file paths exist in OneDrive"
    echo "3. Check that your client secret is the 'Value' not 'Secret ID'"
    echo "4. Verify the UPN extraction is correct for your domain"
fi

echo ""
echo "🔧 For production testing, use:"
echo "   curl -I 'https://vah-api-staging.onrender.com/api/mail-items/25/download'"
echo "   (with your session cookie for authenticated requests)"
