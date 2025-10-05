# JWT Token Testing Guide

## 🔑 **Getting Your JWT Token**

### Method 1: Browser Console (Fastest)
```js
// After logging into your dashboard
localStorage.getItem('vah_jwt')
```

### Method 2: API Login (cURL)
```bash
curl -s -X POST https://vah-api-staging.onrender.com/api/auth/login \ # pragma: allowlist secret
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' # pragma: allowlist secret
# Copy the "token" from the JSON response
```

### Method 3: Test Users
```bash
# Admin user
curl -s -X POST https://vah-api-staging.onrender.com/api/auth/login \ # pragma: allowlist secret
  -H "Content-Type: application/json" \
  -d '{"email":"admin@virtualaddresshub.co.uk","password":"AdminPass123!"}' # pragma: allowlist secret

# Regular user  
curl -s -X POST https://vah-api-staging.onrender.com/api/auth/login \ # pragma: allowlist secret
  -H "Content-Type: application/json" \
  -d '{"email":"user@virtualaddresshub.co.uk","password":"UserPass123!"}' # pragma: allowlist secret
```

## 🧪 **Ready-to-Run Test Commands**

### Set your token (replace with actual token)
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
MAIL_ID="1"  # Replace with actual mail item ID
```

### Test 1: List Mail Items
```bash
curl -H "Authorization: Bearer $TOKEN" \
     https://vah-api-staging.onrender.com/api/mail-items
```

### Test 2: Get Scan URL
```bash
curl -H "Authorization: Bearer $TOKEN" \
     https://vah-api-staging.onrender.com/api/mail-items/$MAIL_ID/scan-url
```

### Test 3: Download File (Proxy Mode)
```bash
curl -H "Authorization: Bearer $TOKEN" \
     https://vah-api-staging.onrender.com/api/mail-items/$MAIL_ID/download \
     -o "downloaded_file.pdf"
```

### Test 4: Download File (Redirect Mode)
```bash
curl -L -H "Authorization: Bearer $TOKEN" \
     https://vah-api-staging.onrender.com/api/mail-items/$MAIL_ID/download \
     -o "downloaded_file.pdf"
```

### Test 5: Test Download Endpoint
```bash
curl -H "Authorization: Bearer $TOKEN" \
     https://vah-api-staging.onrender.com/api/test/download/test_mail_$MAIL_ID.pdf \
     -o "test_file.pdf"
```

## 🔍 **Token Inspection (Safe)**

```js
// Decode token payload (no secrets revealed)
JSON.parse(atob(localStorage.getItem('vah_jwt').split('.')[1]))
```

## ⚠️ **Security Tips**

- Keep tokens secret - don't paste in logs/PRs
- Tokens expire - get fresh ones if you get 401 errors
- Use Bearer token for scripts (simpler than cookies)
- Test with non-production data when possible

## 🚀 **Quick Test Sequence**

```bash
# 1. Get token
TOKEN=$(curl -s -X POST https://vah-api-staging.onrender.com/api/auth/login \ # pragma: allowlist secret
  -H "Content-Type: application/json" \
  -d '{"email":"user@virtualaddresshub.co.uk","password":"UserPass123!"}' \ # pragma: allowlist secret
  | jq -r '.token')

# 2. Test endpoints
echo "Testing with token: ${TOKEN:0:20}..."

# List mail items
curl -H "Authorization: Bearer $TOKEN" \
     https://vah-api-staging.onrender.com/api/mail-items | jq

# Test download (replace MAIL_ID with actual ID from above)
curl -H "Authorization: Bearer $TOKEN" \
     https://vah-api-staging.onrender.com/api/mail-items/1/scan-url | jq
```

## 📋 **Expected Responses**

- **200**: Success with JSON data
- **401**: Token expired/invalid - get fresh token
- **404**: Mail item not found - check MAIL_ID
- **500**: Server error - check logs
