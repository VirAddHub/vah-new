# OneDrive for Business Graph API Setup

## Overview

This document explains the correct Microsoft Graph API configuration for accessing OneDrive for Business personal drives (e.g., `https://virtualaddresshubcouk-my.sharepoint.com/personal/ops_virtualaddresshub_co_uk/...`).

## Microsoft Azure Configuration

### Required Permissions

1. **Files.Read.All (Application)** ✅
   - **Grant admin consent** - This is required for OneDrive personal drives
   - **Note**: `Sites.Selected` is for SharePoint sites, not OneDrive personal drives

2. **No PnP site grant needed**
   - `Grant-PnPAzureADAppSitePermission` is only for SharePoint site collections
   - OneDrive personal drives use user-based access, not site-based

### UPN Configuration

For the path `/personal/ops_virtualaddresshub_co_uk`, the UPN is: **`ops@virtualaddresshub.co.uk`**

## Code Implementation

The updated `apps/backend/src/services/sharepoint.ts` automatically detects OneDrive personal drives and uses the correct Graph API endpoint with robust error handling:

### Key Features

1. **Multi-part Domain Support**: Correctly handles domains like `virtualaddresshub.co.uk`
2. **Safe Path Encoding**: Each path segment is properly encoded
3. **Detailed Error Messages**: Graph API errors include response details
4. **URL Normalization**: Handles trailing slashes and URL decoding

```typescript
// Robust UPN extraction for multi-part domains
function extractUPNFromSitePath(sitePath: string): string {
  const m = /^\/personal\/([^/]+)$/.exec(sitePath);
  if (!m) throw new Error(`Invalid OneDrive personal path: ${sitePath}`);
  const alias = m[1]; // e.g., "ops_virtualaddresshub_co_uk"
  const parts = alias.split("_").filter(Boolean);
  if (parts.length < 2) throw new Error(`Unexpected alias format: ${alias}`);
  const user = parts.shift()!;              // "ops"
  const domain = parts.join(".");           // "virtualaddresshub.co.uk"
  return `${user}@${domain}`;
}

// Safe path encoding for each segment
function encodeDrivePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(seg => encodeURIComponent(seg))
    .join("/");
}

// Automatically detects OneDrive vs SharePoint
if (SITE_PATH.startsWith("/personal/")) {
    const upn = extractUPNFromSitePath(SITE_PATH);
    contentUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/drive/root:/${encodeDrivePath(drivePath)}:/content`;
} else {
    contentUrl = `https://graph.microsoft.com/v1.0/sites/${HOST}:${SITE_PATH}:/drive/root:/${encodeDrivePath(drivePath)}:/content`;
}
```

## Environment Variables

```bash
# Microsoft Graph Configuration
GRAPH_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GRAPH_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GRAPH_CLIENT_SECRET=your_secret_here

# OneDrive Configuration
GRAPH_SITE_HOST=virtualaddresshubcouk-my.sharepoint.com
GRAPH_SITE_PATH=/personal/ops_virtualaddresshub_co_uk
```

## Testing

### Quick Test Commands

1. **Token Test**:
```bash
curl -s -D - -X POST "https://login.microsoftonline.com/$GRAPH_TENANT_ID/oauth2/v2.0/token" \
 -H "Content-Type: application/x-www-form-urlencoded" \
 -d "client_id=$GRAPH_CLIENT_ID&client_secret=$GRAPH_CLIENT_SECRET&grant_type=client_credentials&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default"
```

2. **File Access Test**:
```bash
ACCESS_TOKEN="eyJ..."  # from token test
UPN="ops@virtualaddresshub.co.uk"
DRIVE_PATH="Documents/Scanned_Mail/user4_1111_bilan.pdf"

curl -i -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/users/$UPN/drive/root:/$DRIVE_PATH:/content"
```

### Automated Test Scripts

Run the provided test scripts:

```bash
# Test with shell commands
./test-onedrive-commands.sh

# Test with Node.js (more detailed)
node test-onedrive-graph.js
```

## Expected Behavior

### Successful Response
- **Token test**: Returns 200 with `access_token`
- **File access**: Returns 200 with file content or 302/307 redirect to download URL

### Common Issues

1. **403 Forbidden**: 
   - Check that `Files.Read.All` has admin consent
   - Verify the UPN is correct

2. **404 Not Found**:
   - Verify the file path exists in OneDrive
   - Check the drive path format

3. **401 Unauthorized**:
   - Check client credentials
   - Verify tenant ID

## Security Benefits

- ✅ Server-side authentication (tokens never exposed to clients)
- ✅ User authorization enforcement before file access
- ✅ No public URL exposure
- ✅ Strong cache control headers
- ✅ Zero Microsoft sign-in required for users

## Migration from SharePoint Sites

If you later move files to a SharePoint site (URLs like `/sites/YourSite/...`), you would need to:

1. Change to `Sites.Selected` permission
2. Grant app access to the specific site with PnP
3. Update `GRAPH_SITE_PATH` to the site path
4. The code will automatically use the SharePoint endpoint

## Recent Improvements

### Fixed Issues

1. **Multi-part Domain Support**: 
   - **Before**: `ops_virtualaddresshub_co_uk` → `ops@virtualaddresshub.co` ❌
   - **After**: `ops_virtualaddresshub_co_uk` → `ops@virtualaddresshub.co.uk` ✅

2. **Better Error Messages**:
   - **Before**: `Graph content error 400` ❌
   - **After**: `Graph content error 400: {"error":{"code":"InvalidRequest","message":"The request is malformed or incorrect"}}` ✅

3. **Safer Path Encoding**:
   - **Before**: `encodeURI()` could let unsafe characters through
   - **After**: Each path segment is individually encoded

4. **URL Normalization**:
   - Handles trailing slashes and URL-encoded characters
   - More robust path extraction

## Troubleshooting

### Check Permissions
```bash
# List app permissions
az ad app show --id $GRAPH_CLIENT_ID --query "requiredResourceAccess"
```

### Verify UPN Extraction
The code automatically extracts UPN from the site path:
- `/personal/ops_virtualaddresshub_co_uk` → `ops@virtualaddresshub.co.uk`
- `/personal/john_company_com` → `john@company.com`
- `/personal/admin_mycompany_co_uk` → `admin@mycompany.co.uk`

### Test Different File Paths
```bash
# Test various paths
DRIVE_PATH="Documents/Scanned_Mail/"
DRIVE_PATH="Documents/"
DRIVE_PATH="Scanned_Mail/"
```

### Debug Graph Errors
With the improved error handling, you'll now see detailed error messages:
```bash
# Example error output
Graph content error 403: {"error":{"code":"Forbidden","message":"Insufficient privileges to complete the operation"}}
```

## Production Checklist

- [ ] `Files.Read.All` permission granted with admin consent
- [ ] Environment variables configured
- [ ] Test scripts pass
- [ ] File paths verified
- [ ] Error handling tested
- [ ] Security headers confirmed
