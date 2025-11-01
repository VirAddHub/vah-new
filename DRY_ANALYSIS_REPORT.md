# DRY Violations Analysis Report

This report identifies code duplication and opportunities for refactoring across the VAH codebase.

## 🔴 Critical Duplications

### 1. Multiple API Client Implementations

**Problem:** At least 5 different API client implementations with overlapping functionality:

- `apps/frontend/lib/api.ts` - Basic API wrapper with token handling
- `apps/frontend/lib/apiClient.ts` - Typed API client with methods (get, post, put, patch, del)
- `apps/frontend/lib/api-client.ts` - Legacy API client with auth-aware fetch
- `apps/frontend/lib/apiDirect.ts` - Direct backend API client (no BFF)
- `apps/frontend/lib/apiClient 2.ts` - Duplicate file (likely accidental)

**Impact:** 
- Inconsistent error handling
- Different token retrieval patterns
- Maintenance burden when API changes
- Components using different clients inconsistently

**Recommendation:**
```typescript
// Consolidate into single unified client
// apps/frontend/lib/api/unified-client.ts
export const apiClient = {
  get, post, put, patch, delete,
  // Auto-handles token, errors, CSRF, etc.
};
```

---

### 2. Multiple Auth/Token Managers

**Problem:** At least 3 different auth management systems:

- `apps/frontend/lib/token-manager.ts` - Main token manager with events
- `apps/frontend/lib/index.ts` - `AuthManager` class (legacy)
- `apps/frontend/lib/client-auth.ts` - `ClientAuthManager` class
- `apps/frontend/contexts/AuthContext.tsx` - React context with its own auth logic

**Duplicated Patterns:**
- `localStorage.getItem('vah_jwt')` found in **25+ files**
- Token retrieval in API clients duplicated
- Multiple `getToken()` implementations
- Inconsistent cookie/localStorage handling

**Recommendation:**
```typescript
// Single source of truth
// apps/frontend/lib/auth/token-manager.ts
export const tokenManager = {
  get, set, clear, onChange
};

// Single auth context using token-manager
export function useAuth() { /* uses tokenManager */ }
```

---

### 3. Repeated Token Retrieval Patterns

**Files with direct `localStorage.getItem('vah_jwt')`:**
- `apps/frontend/components/EnhancedAdminDashboard.tsx`
- `apps/frontend/components/MailManagement.tsx`
- `apps/frontend/components/UserDashboard.tsx`
- `apps/frontend/lib/apiDirect.ts`
- `apps/frontend/lib/services/http.ts`
- `apps/frontend/lib/forwardingActions.ts`
- ...and 19+ more files

**Recommendation:**
- Use `tokenManager.get()` from centralized module
- Remove all direct `localStorage.getItem('vah_jwt')` calls

---

### 4. Duplicate Authorization Header Logic

**Pattern repeated in 55+ files:**
```typescript
const token = getToken(); // or localStorage.getItem('vah_jwt')
headers.set('Authorization', `Bearer ${token}`);
```

**Found in:**
- Multiple API client implementations
- Direct fetch calls in components
- BFF route handlers
- Service files

**Recommendation:**
- Centralize in API client wrapper
- Use interceptors/middleware pattern

---

### 5. Repeated Form Validation Logic

**Email Validation:**
- `UserCreationForm.tsx` - Custom validation
- `UserEditForm.tsx` - Custom validation  
- `SignupStep2.tsx` - Custom validation
- `ContactPage.tsx` - `emailRegex` inline
- Backend has Zod schemas but frontend doesn't use them consistently

**Password Validation:**
- `validatePassword()` in `lib/index.ts`
- Custom validation in `UserCreationForm.tsx`
- Custom validation in `SignupStep2.tsx`
- Backend Zod schema exists but not reused

**Recommendation:**
```typescript
// apps/frontend/lib/validation/schemas.ts
export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8).regex(...);
export const phoneSchema = z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,}$/);

// Reuse backend schemas or create shared package
```

---

### 6. Loading State Patterns

**Found 80+ instances of:**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [loading, setLoading] = useState(false);
```

**Recommendation:**
```typescript
// Custom hook
export function useAsyncOperation<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const execute = async (fn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };
  
  return { loading, error, execute };
}
```

---

### 7. Error Handling Patterns

**Repeated try/catch blocks with similar logging:**
```typescript
try {
  // API call
} catch (error) {
  console.error('Error:', error);
  // Handle error
}
```

**Found in:** Most component files

**Recommendation:**
- Use error boundaries for React components
- Centralize error handling in API client
- Use toast notifications consistently via hook

---

### 8. Date Formatting

**Found 199 matches** for date operations:
- `new Date()`
- `Date.now()`
- `toLocaleString()`
- Custom formatting functions

**Recommendation:**
```typescript
// apps/frontend/lib/utils/dates.ts
export const formatDate = (date: string | number | Date, format?: string) => {
  // Single implementation
};

export const formatRelativeTime = (date: string | number | Date) => {
  // e.g., "2 hours ago"
};
```

---

### 9. Toast/Notification Patterns

**Found in 81 files:**
- Direct `toast()` calls
- `useToast()` hook
- Custom notification implementations

**Recommendation:**
- Standardize on single toast system (appears to be using shadcn/ui toast)
- Create wrapper hooks for common patterns:
```typescript
export function useApiToast() {
  const { toast } = useToast();
  return {
    success: (msg: string) => toast({ title: "Success", description: msg }),
    error: (msg: string) => toast({ title: "Error", description: msg, variant: "destructive" }),
  };
}
```

---

### 10. API Response Handling

**Multiple patterns for handling API responses:**
```typescript
// Pattern 1
if (response.ok) { /* ... */ }

// Pattern 2
if (response.ok && response.data) { /* ... */ }

// Pattern 3
const result = await api();
if (result.ok) { /* ... */ }

// Pattern 4
if (isOk(response)) { /* ... */ }
```

**Recommendation:**
- Standardize on single response type: `{ ok: boolean, data?: T, error?: string }`
- Use type guards consistently
- Create helper: `unwrapApiResponse<T>(response)`

---

## 🟡 Medium Priority Duplications

### 11. API Base URL Configuration

**Multiple definitions:**
- `process.env.NEXT_PUBLIC_API_URL` used directly in many files
- `API_BASE` in some files
- `API()` function in others

**Recommendation:**
- Single config file: `apps/frontend/lib/config/api.ts`
```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '...';
export const apiUrl = (path: string) => `${API_BASE}${path}`;
```

---

### 12. Duplicate Component Files

**Found duplicates:**
- `UserDashboard.tsx` and `UserDashboard 2.tsx`
- `ContactPage.tsx` and `ContactPage 2.tsx`
- `ForwardingSection.tsx` and `ForwardingSection 2.tsx`
- `BillingSection.tsx` and `BillingSection 2.tsx`
- `apiClient.ts` and `apiClient 2.ts`

**Recommendation:**
- Remove backup files or consolidate
- Use Git history instead of numbered backups

---

### 13. Fetch with Credentials Pattern

**Repeated in many files:**
```typescript
fetch(url, { credentials: 'include', ...init })
```

**Recommendation:**
- Include in base API client configuration
- Don't repeat in every fetch call

---

### 14. CSRF Token Handling

**Duplicated CSRF header logic:**
- Some API clients include it
- Some don't
- Inconsistent application

**Recommendation:**
- Centralize CSRF handling in main API client
- Auto-inject for state-changing requests

---

## 🟢 Low Priority (Minor Duplications)

### 15. Console Logging Patterns

**Inconsistent logging:**
- Some files use `console.log`
- Some use `console.error`
- Some use debug flags
- Some have no logging

**Recommendation:**
- Create logger utility with log levels
- Use consistent prefixes: `[API]`, `[Auth]`, etc.

---

### 16. Type Definitions

**Common types defined in multiple places:**
- `User` type in multiple files
- `MailItem` in multiple files
- `ForwardingRequest` in multiple files

**Recommendation:**
- Centralize in `apps/frontend/types/` directory
- Export from single source files

---

## 📊 Summary Statistics

- **API Client Implementations:** 5+
- **Auth Managers:** 4
- **Direct Token Retrievals:** 25+ files
- **Loading State Patterns:** 80+ instances
- **Date Formatting Calls:** 199 matches
- **Toast Usage:** 81 files
- **Duplicate Files:** 5+ pairs

---

## 🎯 Refactoring Priority

### Phase 1 (High Impact, Low Risk)
1. Consolidate API clients into single unified client
2. Centralize token management (use existing `token-manager.ts`)
3. Remove direct `localStorage.getItem('vah_jwt')` calls
4. Standardize API response handling

### Phase 2 (Medium Impact)
5. Create shared validation utilities
6. Standardize loading/error state patterns
7. Consolidate date formatting
8. Remove duplicate component files

### Phase 3 (Cleanup)
9. Standardize error handling
10. Consolidate toast usage
11. Create shared types package
12. Add logging utility

---

## 🔧 Quick Wins

1. **Delete duplicate files:**
   - `apps/frontend/lib/apiClient 2.ts`
   - `apps/frontend/components/UserDashboard 2.tsx`
   - `apps/frontend/components/ContactPage 2.tsx`
   - `apps/frontend/components/admin/ForwardingSection 2.tsx`
   - `apps/frontend/components/admin/BillingSection 2.tsx`

2. **Create aliases:**
   ```typescript
   // apps/frontend/lib/api/index.ts
   export { apiClient } from './apiClient';
   export type { ApiResponse } from '../types/api';
   ```

3. **Add eslint rule:**
   ```json
   {
     "rules": {
       "no-restricted-syntax": [
         "error",
         {
           "selector": "CallExpression[callee.property.name='getItem'][arguments.0.value='vah_jwt']",
           "message": "Use tokenManager.get() instead of direct localStorage access"
         }
       ]
     }
   }
   ```

---

## 📝 Notes

- Many duplications likely occurred during rapid development/refactoring
- Some patterns may be intentional (e.g., different API clients for different purposes)
- Review with team before consolidating to ensure no breaking changes
- Consider creating a shared utilities package for common patterns

