# Frontend Login Fix Guide

## Problem Identified

Your password reset works because it's a simpler flow, but login is broken due to **API response format mismatches** between backend and frontend.

### Backend Login Response (from `src/server/routes/auth.ts`):
```json
{
  "ok": true,
  "data": {
    "user": {
      "user_id": 123,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_admin": false,
      "role": "user"
    },
    "token": "eyJ..."
  }
}
```

### Frontend Expects (from `lib/api-client.ts` line 176-179):
```typescript
if (resp.ok && resp.data && resp.data.data && 'token' in resp.data.data) {
  const token = resp.data.data.token;  // Looking for resp.data.data.token
  // But backend sends resp.data.token (one level less nesting)
}
```

## The Issue

The frontend is looking for `response.data.data.token` but backend returns `response.data.token`.

## Solutions

You have 2 options:

### Option 1: Fix Frontend (Recommended - Less Risk)

Update the frontend API client to match the backend response format.

### Option 2: Fix Backend

Change the backend response format (riskier, might break other integrations).

---

## Implementation - Option 1 (Fix Frontend)

### File 1: `/apps/frontend/lib/api-client.ts`

**Location:** Lines 175-179

**Change:**
```typescript
// OLD (Lines 175-179):
if (resp.ok && resp.data && resp.data.data && 'token' in resp.data.data) {
    const token = resp.data.data.token as string;
    // ...
}

// NEW:
if (resp.ok && resp.data && 'token' in resp.data) {
    const token = resp.data.token as string;
    console.log('🔑 TOKEN DEBUG - Storing token:', token.substring(0, 50) + '...');
    setToken(token);
    console.log('✅ JWT token stored successfully in localStorage');

    // Also store user data
    if (resp.data.user) {
        setStoredUser(resp.data.user);
        console.log('✅ User data stored:', resp.data.user);
    }
}
```

### File 2: `/apps/frontend/contexts/AuthContext.tsx`

**Location:** Lines 100-130 (login initialization)

**Find the login function around line 130 and update:**

```typescript
// Add better error handling for the login flow
const login = async (credentials: { email: string; password: string }) => {
    try {
        setIsLoading(true);

        // Call the API client login
        const response = await apiClient.login(credentials.email, credentials.password);

        console.log('🔍 AuthContext - Login response:', response);

        if (!response.ok) {
            throw new Error(response.message || 'Login failed');
        }

        // Extract user from response
        const user = response.data.user;

        if (!user) {
            throw new Error('No user data received from server');
        }

        // Update context state
        setUser(user);
        setStatus('authed');
        setAuthInitialized(true);

        console.log('✅ AuthContext - Login successful, user:', user);

    } catch (error) {
        console.error('❌ AuthContext - Login error:', error);
        setUser(null);
        setStatus('guest');
        throw error;
    } finally {
        setIsLoading(false);
    }
};
```

---

## Testing the Fix

### 1. Test Backend API Directly

```bash
# Test if backend is working
# pragma: allowlist secret
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"your_password_here"}' # pragma: allowlist secret

# Should return:
# {"ok":true,"data":{"user":{...},"token":"eyJ..."}}
```

### 2. Check User Exists in Database

```bash
# Via backend debug endpoint
curl http://localhost:3001/api/auth/debug-user/test@example.com
```

### 3. Create Test User (if needed)

```bash
# pragma: allowlist secret
curl -X POST http://localhost:3001/api/auth/debug-update-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","newPassword":"your_new_password_here"}' # pragma: allowlist secret
```

### 4. Test Frontend Login

1. Open browser console (F12)
2. Go to http://localhost:3000/login
3. Enter credentials
4. Watch console for debug logs:
   - `🔑 TOKEN DEBUG - Storing token:...`
   - `✅ JWT token stored successfully`
   - `✅ User data stored:...`

---

## Additional Fixes Needed

### Fix 1: Update AuthContext.tsx - Fix whoami call

**Location:** `/apps/frontend/contexts/AuthContext.tsx` around line 100

**Problem:** The whoami endpoint might return data in wrong format too.

**Fix:**
```typescript
// Around line 100, in the useEffect initialization:
try {
    const token = tokenManager.get();
    if (!token) {
        setUser(null);
        setStatus('guest');
        setIsLoading(false);
        return;
    }

    // Call whoami to verify token
    const response = await AuthAPI.whoami();

    // Fix: Handle the response format properly
    if (response.ok && response.data) {
        // Backend returns { ok: true, data: { user_id, email, is_admin, role } }
        const userData = {
            id: response.data.user_id,
            email: response.data.email,
            is_admin: response.data.is_admin,
            role: response.data.role
        };

        setUser(userData);
        setStatus('authed');
    } else {
        // Token invalid, clear it
        tokenManager.clear();
        setUser(null);
        setStatus('guest');
    }
} catch (error) {
    console.error('Auth initialization error:', error);
    tokenManager.clear();
    setUser(null);
    setStatus('guest');
} finally {
    setIsLoading(false);
    setAuthInitialized(true);
}
```

### Fix 2: Ensure API URL is correct

**File:** `/apps/frontend/lib/api-base.ts`

**Check:**
```typescript
// Should point to your Render backend URL or localhost
const RAW = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const API_BASE = RAW.replace(/\/+$/, '');
```

**Make sure `.env.local` has:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
# or for production:
# NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
```

---

## Deployment to Production

### Backend (Render)
1. Ensure these environment variables are set:
   ```
   DATABASE_URL=<postgres_url>
   JWT_SECRET=<your_secret>
   NODE_ENV=production
   ```

2. Deploy latest code

### Frontend (Vercel)
1. Update environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
   BACKEND_API_ORIGIN=https://your-render-backend.onrender.com
   ```

2. Deploy latest code

---

## Quick Fix Checklist

- [ ] Update `api-client.ts` to look for `resp.data.token` instead of `resp.data.data.token`
- [ ] Update `AuthContext.tsx` to handle login response properly
- [ ] Fix whoami response handling in AuthContext
- [ ] Verify `.env.local` has correct `NEXT_PUBLIC_API_URL`
- [ ] Test login with browser console open
- [ ] Verify JWT token is stored in localStorage after login
- [ ] Check that redirect to dashboard works after successful login

---

## Debugging Tips

### Check if JWT is being stored:
```javascript
// In browser console after login attempt:
localStorage.getItem('vah_token')
```

### Check API response format:
```javascript
// Add this temporarily in Login.tsx handleSubmit:
console.log('Full API response:', JSON.stringify(response, null, 2));
```

### Check AuthContext state:
```javascript
// In any component:
const { user, isAuthenticated, isLoading } = useAuth();
console.log({ user, isAuthenticated, isLoading });
```

---

## Common Errors & Solutions

### Error: "No user data received from server"
**Cause:** Response format mismatch
**Solution:** Apply the api-client.ts fix above

### Error: "Invalid or expired token"
**Cause:** JWT_SECRET mismatch or token not being sent
**Solution:** Check JWT_SECRET in backend .env, ensure token is in localStorage

### Error: "CORS error"
**Cause:** Backend not allowing frontend origin
**Solution:** Check CORS configuration in backend server.ts (already fixed in your case)

### Login seems to work but redirects back to login
**Cause:** AuthContext not updating state properly
**Solution:** Apply the AuthContext.tsx fixes above
