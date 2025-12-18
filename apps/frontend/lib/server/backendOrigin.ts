/**
 * Backend Origin Resolution for BFF Routes
 * 
 * This module provides a centralized way to resolve the backend API origin
 * for Next.js API route handlers (BFF - Backend For Frontend).
 * 
 * IMPORTANT: Use SERVER environment variables (BACKEND_API_ORIGIN) in route handlers.
 * Do NOT rely on NEXT_PUBLIC_* variables inside server-side code.
 * 
 * Environment Variables:
 * - BACKEND_API_ORIGIN (primary, server-side only, required in production)
 * - NEXT_PUBLIC_API_URL (legacy/backwards compatibility, deprecated for BFF routes)
 * 
 * Render-Only: Only Render origins are allowed (no localhost).
 * Allowed origins:
 * - https://vah-api.onrender.com (production)
 * - https://vah-api-staging.onrender.com (staging)
 */

// Render-only allowlist
const ALLOWED_ORIGINS = [
  'https://vah-api.onrender.com',
  'https://vah-api-staging.onrender.com',
];

// Log once per server process
let didLog = false;

/**
 * Validates that the origin is in the Render allowlist.
 * 
 * @param origin The origin URL to validate
 * @throws Error if origin is not in allowlist
 */
function validateRenderOrigin(origin: string): void {
  if (!ALLOWED_ORIGINS.includes(origin)) {
    throw new Error(
      `Invalid BACKEND_API_ORIGIN: must be Render origin. ` +
      `Got: ${origin}. ` +
      `Allowed: ${ALLOWED_ORIGINS.join(', ')}`
    );
  }
}

/**
 * Gets the backend API origin URL for BFF routes.
 * 
 * Production (NODE_ENV === 'production'):
 * - Requires BACKEND_API_ORIGIN (ignores NEXT_PUBLIC_API_URL)
 * - Must be Render origin (allowlisted)
 * - Throws error if missing or invalid
 * 
 * Non-production:
 * - Prefers BACKEND_API_ORIGIN (must be allowlisted)
 * - Falls back to NEXT_PUBLIC_API_URL (warns, must be allowlisted)
 * - Falls back to staging Render origin (warns)
 * 
 * @returns The backend origin URL (without trailing slash)
 * @throws Error if:
 *   - Production: BACKEND_API_ORIGIN is not set
 *   - Origin is not in Render allowlist
 */
export function getBackendOrigin(): string {
  const isProduction = process.env.NODE_ENV === 'production';

  // Production: Require BACKEND_API_ORIGIN (ignore NEXT_PUBLIC_API_URL)
  if (isProduction) {
    if (!process.env.BACKEND_API_ORIGIN) {
      const error = new Error('BACKEND_API_ORIGIN is not set');
      if (!didLog) {
        console.error('[backendOrigin] PRODUCTION ERROR:', error.message);
        didLog = true;
      }
      throw error;
    }

    const origin = process.env.BACKEND_API_ORIGIN.trim().replace(/\/+$/, '');
    validateRenderOrigin(origin);

    if (!didLog) {
      console.log(`[backendOrigin] Using BACKEND_API_ORIGIN: ${origin}`);
      didLog = true;
    }
    return origin;
  }

  // Non-production: Prefer BACKEND_API_ORIGIN
  if (process.env.BACKEND_API_ORIGIN) {
    const origin = process.env.BACKEND_API_ORIGIN.trim().replace(/\/+$/, '');
    validateRenderOrigin(origin);

    if (!didLog) {
      console.log(`[backendOrigin] Using BACKEND_API_ORIGIN: ${origin}`);
      didLog = true;
    }
    return origin;
  }

  // Non-production: Fallback to NEXT_PUBLIC_API_URL (legacy, warn)
  if (process.env.NEXT_PUBLIC_API_URL) {
    const origin = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, '');
    validateRenderOrigin(origin);

    if (!didLog) {
      console.warn(
        `[backendOrigin] Using NEXT_PUBLIC_API_URL (legacy). ` +
        `Consider using BACKEND_API_ORIGIN instead: ${origin}`
      );
      didLog = true;
    }
    return origin;
  }

  // Non-production: Fallback to staging Render origin (warn)
  const fallback = 'https://vah-api-staging.onrender.com';
  if (!didLog) {
    console.warn(
      `[backendOrigin] No BACKEND_API_ORIGIN set. Using staging fallback: ${fallback}`
    );
    didLog = true;
  }
  return fallback;
}

/**
 * Asserts that backend origin is configured.
 * Throws with a detailed error message listing which env vars were checked.
 * 
 * @returns The backend origin URL (same as getBackendOrigin)
 * @throws Error if backend origin cannot be resolved or is invalid
 */
export function assertBackendOrigin(): string {
  return getBackendOrigin();
}
