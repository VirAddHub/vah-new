# Debugging EnhancedUserDashboard

## Issue
User reported: "i cant see nothing on the frontend of the enhanceduserdashboard ever since u did the srs thing everything has broken"

## Root Cause Investigation

The EnhancedUserDashboard component has been reverted to manual loading (not using SWR) but is still broken. The component uses the following data loading pattern:

```typescript
const loadMailItems = async () => {
    const response = await mailService.getMailItems();
    if (response.ok) {
        setMailItems(response.data || []);
    }
};
```

This calls the `mailService.getMailItems()` function which in turn calls:
```typescript
const { data } = await api('/api/mail-items', { method: 'GET' });
```

The `api()` function properly:
1. Gets the token from `getToken()` via `tokenManager.get()`
2. Adds the `Authorization: Bearer ${token}` header
3. Makes the fetch request with `credentials: 'include'`

## Debugging Logs Added

### 1. In `/lib/api.ts`
Added logging before and after every API request:
```typescript
console.log('[api] Making request:', { url, method, hasToken: !!token });
// ... fetch ...
console.log('[api] Response:', { url, status: res.status, ok: res.ok, data });
```

### 2. In `/components/EnhancedUserDashboard.tsx`
Added logging in all three loading functions:
- `loadMailItems()` - logs start, response, success/error
- `loadForwardingRequests()` - logs start, response, success/error
- `loadInvoices()` - logs start, response, success/error

## What to Check in Browser Console

When you load the EnhancedUserDashboard page, you should see logs like:

### Expected Success Pattern:
```
[EnhancedUserDashboard] loadMailItems - Starting...
[api] Making request: { url: "https://vah-api-staging.onrender.com/api/mail-items", method: "GET", hasToken: true }
[api] Response: { url: "...", status: 200, ok: true, data: { ok: true, data: [...] } }
[EnhancedUserDashboard] loadMailItems - Response: { ok: true, data: [...] }
[EnhancedUserDashboard] loadMailItems - Success, items: 5
```

### Expected Failure Patterns:

#### 1. No Token (401 Error)
```
[EnhancedUserDashboard] loadMailItems - Starting...
[api] Making request: { url: "...", method: "GET", hasToken: false }
[api] Response: { url: "...", status: 401, ok: false, data: { ok: false, error: "Unauthorized" } }
[EnhancedUserDashboard] loadMailItems - Failed: { ok: false, error: "Unauthorized" }
```

**Fix:** Check if token exists in localStorage under key `vah_jwt`

#### 2. Invalid Token (401 Error)
```
[api] Making request: { url: "...", method: "GET", hasToken: true }
[api] Response: { url: "...", status: 401, ok: false, data: { ok: false, error: "Invalid token" } }
```

**Fix:** Clear localStorage and re-login

#### 3. CORS Error
```
[EnhancedUserDashboard] loadMailItems - Starting...
[api] Making request: { url: "...", method: "GET", hasToken: true }
❌ Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Fix:** Update backend CORS config to include the frontend origin

#### 4. Network/Server Error (500 Error)
```
[api] Response: { url: "...", status: 500, ok: false, data: { ok: false, error: "..." } }
```

**Fix:** Check backend logs for database/query errors

#### 5. Fetch Throws Exception
```
[EnhancedUserDashboard] loadMailItems - Starting...
[api] Making request: { url: "...", method: "GET", hasToken: true }
[EnhancedUserDashboard] loadMailItems - Error: TypeError: Failed to fetch
```

**Fix:** Network issue or API server is down

## Steps to Debug

1. **Open the EnhancedUserDashboard page** in your browser
2. **Open Developer Console** (F12 or Cmd+Option+I)
3. **Go to Console tab**
4. **Look for the logs** starting with `[EnhancedUserDashboard]` and `[api]`
5. **Check for errors**:
   - Red errors indicating fetch failures
   - 401/403/500 status codes
   - CORS errors
   - Network errors

6. **Check Network tab**:
   - Look for requests to `/api/mail-items`, `/api/forwarding/requests`, `/api/billing/invoices`
   - Check if the `Authorization` header is present
   - Check the response status and body

7. **Check Application/Storage tab**:
   - Look for `localStorage` → `vah_jwt` key
   - Verify the token exists and is not expired

## Common Issues and Fixes

### Issue 1: Token Not Set
**Symptoms:** `hasToken: false` in logs
**Fix:** Re-login to get a new token

### Issue 2: Token Expired/Invalid
**Symptoms:** 401 errors with `hasToken: true`
**Fix:**
```javascript
localStorage.removeItem('vah_jwt');
// Then re-login
```

### Issue 3: Wrong API URL
**Symptoms:** 404 errors or different domain in requests
**Check:** `NEXT_PUBLIC_API_URL` environment variable
**Expected:** `https://vah-api-staging.onrender.com` (or production URL)

### Issue 4: Response Format Mismatch
**Symptoms:** `response.ok` is undefined even though status is 200
**Check:** Response structure - should be `{ ok: true, data: [...] }`

### Issue 5: AuthContext Not Providing Token
**Symptoms:** Token exists in localStorage but not being sent
**Debug:**
```javascript
// In console:
localStorage.getItem('vah_jwt')
// Should return the JWT token
```

## Next Steps

After checking the console logs:
1. **Copy all console output** (especially errors)
2. **Share the logs** so we can see the exact failure point
3. **Check the Network tab** for request/response details
4. We'll fix the specific issue based on the logs

## Files Modified for Debugging

- `/lib/api.ts` - Added request/response logging
- `/components/EnhancedUserDashboard.tsx` - Added detailed loading logs
