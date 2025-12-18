# Server-Side Utilities

This directory contains server-side utilities for Next.js API routes (BFF - Backend For Frontend).

## Backend Origin Configuration

### `backendOrigin.ts`

Centralized backend API origin resolution for BFF routes.

**Render-Only:** Only Render origins are allowed (no localhost).

**Allowed Origins:**
- `https://vah-api.onrender.com` (production)
- `https://vah-api-staging.onrender.com` (staging)

**Environment Variables:**

- **`NEXT_PUBLIC_BACKEND_API_ORIGIN`** (primary, required in production)
  - Public environment variable (accessible in both client and server)
  - Must be a Render origin (allowlisted)
  - Example: `NEXT_PUBLIC_BACKEND_API_ORIGIN=https://vah-api.onrender.com` (production)
  - Example: `NEXT_PUBLIC_BACKEND_API_ORIGIN=https://vah-api-staging.onrender.com` (staging)
  - **Set these in the Render service that runs the Next.js frontend (Environment tab).**

- **`NEXT_PUBLIC_API_URL`** (legacy, backwards compatibility)
  - Deprecated for BFF routes
  - Only used as fallback in non-production if `NEXT_PUBLIC_BACKEND_API_ORIGIN` is not set
  - Must be a Render origin (allowlisted)
  - Will log a warning if used
  - **Ignored in production**
  - **Set these in the Render service that runs the Next.js frontend (Environment tab).**

**Usage:**

```typescript
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const response = await fetch(`${backend}/api/endpoint`, {
      // ...
    });
  } catch (error: any) {
    // Handle configuration errors
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: backend origin not configured' },
        { status: 500 }
      );
    }
    // Handle other errors...
    // Never log cookies or tokens in error messages
  }
}
```

**Behavior:**

- **Production (`NODE_ENV=production`):**
  - ✅ Requires `NEXT_PUBLIC_BACKEND_API_ORIGIN` to be set
  - ❌ Ignores `NEXT_PUBLIC_API_URL` entirely
  - ✅ Must be Render origin (allowlisted)
  - ❌ Throws error if missing or invalid
  - ❌ No fallbacks (fails loudly)
  - **Throws exactly:**
    - `Error("NEXT_PUBLIC_BACKEND_API_ORIGIN is not set")` when missing
    - `Error("Invalid NEXT_PUBLIC_BACKEND_API_ORIGIN: must be Render origin. Got: ...")` when not allowlisted

- **Non-production:**
  - Non-production means `NODE_ENV !== 'production'`
  - ✅ Prefers `NEXT_PUBLIC_BACKEND_API_ORIGIN` (must be allowlisted)
  - ✅ Falls back to `NEXT_PUBLIC_API_URL` if `NEXT_PUBLIC_BACKEND_API_ORIGIN` missing (warns, must be allowlisted)
  - ✅ Falls back to staging Render origin if both missing (warns)
  - ✅ All origins must be Render allowlisted (no localhost)
  - **Can throw exactly:**
    - `Error("Invalid NEXT_PUBLIC_BACKEND_API_ORIGIN: must be Render origin. Got: ...")`
    - `Error("Invalid NEXT_PUBLIC_API_URL: must be Render origin. Got: ...")`

**Render Environment Sanity Check:**

In the frontend Render service (Environment tab), ensure:
- `NEXT_PUBLIC_BACKEND_API_ORIGIN=https://vah-api.onrender.com` (production)
- `NODE_ENV=production` (production)

**Important Notes:**

- ✅ Use `NEXT_PUBLIC_BACKEND_API_ORIGIN` for all BFF routes
- ❌ Do NOT rely on `NEXT_PUBLIC_API_URL` for server-side code (legacy fallback only)
- ✅ Always handle configuration errors gracefully
- ✅ Never log cookies or tokens in error messages
- ✅ Only Render origins are allowed (no localhost)
- ✅ Production requires `NEXT_PUBLIC_BACKEND_API_ORIGIN` (no fallbacks)
