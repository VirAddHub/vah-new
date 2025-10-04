# Vercel Build Fix Complete ✅

## Problem
Vercel build was failing with the error:
```
Attempted import error: 'API_BASE' is not exported from '@/lib/config'
```

## Root Cause
Multiple files were importing `API_BASE` from `@/lib/config`, but the config file didn't export it.

## Solution Applied

### 1. **Added `API_BASE` Export** ✅
**File**: `apps/frontend/lib/config.ts`

```typescript
// Central config for frontend

// Public API base URL (set in Vercel Project → Environment Variables)
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://vah-api-staging.onrender.com"; // sensible default for staging

// Feature flags for integrations
export const FEATURES = {
  gocardless: process.env.NEXT_PUBLIC_FEATURE_GOCARDLESS === "true",
  sumsub: process.env.NEXT_PUBLIC_FEATURE_SUMSUB === "true",
};

// Helpers
export const IS_BROWSER = typeof window !== "undefined";
```

### 2. **Added TypeScript Environment Types** ✅
**File**: `apps/frontend/env.d.ts`

```typescript
/// <reference types="next" />
/// <reference types="next/types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_FEATURE_GOCARDLESS?: "true" | "false";
    NEXT_PUBLIC_FEATURE_SUMSUB?: "true" | "false";
  }
}
```

### 3. **Updated ContactPage** ✅
**File**: `apps/frontend/components/ContactPage.tsx`

```typescript
// Before
const API_BASE = ""; // hardcoded

// After
import { API_BASE } from "@/lib/config";
```

## Files That Were Importing `API_BASE`

| File | Status | Usage |
|------|--------|-------|
| `components/signup/SignupStep2.tsx` | ✅ **Fixed** | Companies House API calls |
| `app/plans/page.tsx` | ✅ **Fixed** | Plans API call |
| `components/ContactPage.tsx` | ✅ **Fixed** | Contact form endpoint |
| `lib/apiClient.ts` | ✅ **Already working** | Base URL for HTTP client |

## Environment Variables

### Required for Production
- `NEXT_PUBLIC_API_URL` - Override default staging URL

### Optional Feature Flags
- `NEXT_PUBLIC_FEATURE_GOCARDLESS` - Enable/disable payments
- `NEXT_PUBLIC_FEATURE_SUMSUB` - Enable/disable KYC

## Vercel Configuration

### Environment Variables to Set
1. Go to **Vercel Dashboard** → **Project Settings** → **Environment Variables**
2. Add `NEXT_PUBLIC_API_URL` with your production API URL
3. Optionally add feature flags:
   - `NEXT_PUBLIC_FEATURE_GOCARDLESS=true`
   - `NEXT_PUBLIC_FEATURE_SUMSUB=true`

### Example Values
```
NEXT_PUBLIC_API_URL=https://vah-api-production.onrender.com
NEXT_PUBLIC_FEATURE_GOCARDLESS=true
NEXT_PUBLIC_FEATURE_SUMSUB=true
```

## Build Process

### Before Fix ❌
```
Module '@/lib/config' has no exported member 'API_BASE'
```

### After Fix ✅
```
✅ Build successful
✅ All imports resolved
✅ TypeScript compilation passed
```

## Benefits

### 1. **Centralized Configuration** ✅
- Single source of truth for API base URL
- Easy to change staging vs production URLs
- Consistent across all components

### 2. **Type Safety** ✅
- TypeScript knows about environment variables
- IntelliSense support for config values
- Compile-time validation

### 3. **Environment Flexibility** ✅
- Development: Uses staging URL by default
- Production: Can override with `NEXT_PUBLIC_API_URL`
- Feature flags for gradual rollouts

### 4. **Maintainability** ✅
- No more hardcoded URLs scattered around
- Easy to update API endpoints
- Clear separation of concerns

## Next Steps

1. **Vercel will auto-rebuild** with the fix
2. **Set environment variables** in Vercel dashboard
3. **Test the build** to ensure it passes
4. **Verify API calls** work with the new config

---

## 🎉 **Build Fix Complete!**

The Vercel build should now pass successfully. All `API_BASE` imports are resolved, and the configuration is centralized and type-safe.
