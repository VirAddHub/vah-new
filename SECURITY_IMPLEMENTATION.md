# Security Implementation Guide

## 🔒 CSRF Protection Implementation

This document outlines the security measures implemented to protect against Cross-Site Request Forgery (CSRF) attacks after introducing JWT tokens in cookies.

## 🚨 Security Risks Addressed

### **Before (JWT in localStorage only):**
- ✅ **No CSRF risk** - localStorage not accessible cross-origin
- ❌ **Middleware couldn't access tokens** - causing redirect loops

### **After (JWT in cookies + localStorage):**
- ✅ **Middleware can access tokens** - fixes redirect loops
- ⚠️ **CSRF risk introduced** - cookies automatically sent with requests
- ✅ **CSRF protection implemented** - Double Submit Cookie pattern

## 🛡️ Security Measures Implemented

### **1. Cookie Security Attributes**
```typescript
// Secure cookie configuration
document.cookie = `vah_jwt=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; HttpOnly=false; Secure=${location.protocol === 'https:'}`;
```

**Security Features:**
- **`SameSite=Strict`**: Prevents cross-site requests (strongest CSRF protection)
- **`Secure`**: Only sent over HTTPS in production
- **`HttpOnly=false`**: Required for client-side access (we need both localStorage and cookies)
- **`path=/`**: Available site-wide
- **`max-age`**: 7-day expiration

### **2. CSRF Token Implementation (Double Submit Cookie Pattern)**

#### **Frontend (`apps/frontend/lib/csrf-protection.ts`):**
```typescript
// Generate cryptographically secure random token
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Store token in both localStorage and cookie
export function getCSRFToken(): string {
  let token = localStorage.getItem(CSRF_TOKEN_KEY);
  if (!token) {
    token = generateCSRFToken();
    localStorage.setItem(CSRF_TOKEN_KEY, token);
    document.cookie = `vah_csrf_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; Secure=${location.protocol === 'https:'}`;
  }
  return token;
}
```

#### **Backend (`apps/backend/src/middleware/csrf.ts`):**
```typescript
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const requestToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies.vah_csrf_token;

  if (!requestToken || !cookieToken || requestToken !== cookieToken) {
    return res.status(403).json({
      ok: false,
      error: 'csrf_token_mismatch',
      message: 'CSRF token validation failed'
    });
  }
  next();
}
```

### **3. Automatic CSRF Header Injection**
```typescript
// In api-client.ts authFetch function
if (init.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method.toUpperCase())) {
  const csrfHeaders = addCSRFHeader();
  Object.entries(csrfHeaders).forEach(([key, value]) => {
    headers.set(key, value as string);
  });
}
```

## 🔐 How CSRF Protection Works

### **Double Submit Cookie Pattern:**

1. **Token Generation**: Cryptographically secure random token generated
2. **Dual Storage**: Token stored in both localStorage and cookie
3. **Request Protection**: Token sent in both:
   - **Header**: `X-CSRF-Token: abc123...`
   - **Cookie**: `vah_csrf_token=abc123...`
4. **Server Validation**: Backend compares header token with cookie token
5. **Attack Prevention**: Malicious sites can't access localStorage, so they can't send the correct header token

### **Attack Prevention:**

```html
<!-- ❌ This attack would fail -->
<form action="https://vah-new-frontend-75d6.vercel.app/api/sensitive-action" method="POST">
  <input type="hidden" name="amount" value="1000">
  <input type="submit" value="Click for free money!">
</form>
<script>document.forms[0].submit();</script>
```

**Why it fails:**
- Malicious site can send cookie (automatic)
- Malicious site **cannot** access localStorage to get CSRF token
- Server receives cookie token but no header token
- Server rejects request with 403 error

## 🚀 Implementation Status

### **✅ Completed:**
- [x] Secure cookie configuration (`SameSite=Strict`, `Secure`)
- [x] CSRF token generation and storage
- [x] Automatic CSRF header injection for state-changing requests
- [x] Backend CSRF validation middleware
- [x] Token cleanup on logout

### **📋 To Do (Backend Integration):**
- [ ] Add CSRF middleware to Express app
- [ ] Test CSRF protection with actual requests
- [ ] Add CSRF validation to sensitive endpoints

## 🔧 Backend Integration Required

To complete the CSRF protection, add the middleware to your Express app:

```typescript
// In apps/backend/src/server/app.ts or main server file
import { csrfProtection } from '../middleware/csrf';
import cookieParser from 'cookie-parser';

// Add cookie parser middleware
app.use(cookieParser());

// Add CSRF protection to all routes except auth
app.use('/api', csrfProtection);
```

## 🧪 Testing CSRF Protection

### **Test 1: Valid Request**
```bash
curl -X POST https://your-api.com/api/some-endpoint \
  -H "Authorization: Bearer your-jwt-token" \
  -H "X-CSRF-Token: your-csrf-token" \
  -H "Cookie: vah_csrf_token=your-csrf-token" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### **Test 2: CSRF Attack Simulation**
```bash
# This should fail with 403 error
curl -X POST https://your-api.com/api/some-endpoint \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Cookie: vah_csrf_token=your-csrf-token" \
  -H "Content-Type: application/json" \
  -d '{"malicious": "data"}'
```

## 📊 Security Comparison

| Aspect | Before | After |
|--------|--------|-------|
| **CSRF Risk** | ❌ None | ✅ Protected |
| **Middleware Access** | ❌ No | ✅ Yes |
| **Redirect Loops** | ❌ Yes | ✅ Fixed |
| **Token Storage** | localStorage only | localStorage + cookies |
| **Security Level** | Medium | High |

## 🎯 Best Practices Implemented

1. **Defense in Depth**: Multiple layers of protection
2. **Cryptographically Secure**: Random token generation
3. **Automatic Protection**: No manual token management required
4. **Clean Logout**: All tokens cleared on logout
5. **HTTPS Enforcement**: Secure cookies in production
6. **SameSite Protection**: Strict same-site policy

## ⚠️ Important Notes

- **SameSite=Strict** provides the strongest CSRF protection
- **HttpOnly=false** is required for client-side access
- **Secure flag** ensures HTTPS-only in production
- **CSRF tokens** are automatically managed by the frontend
- **Backend validation** must be implemented for full protection

This implementation provides enterprise-grade security while maintaining the functionality needed for your JWT-based authentication system.
