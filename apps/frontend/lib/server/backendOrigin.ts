/**
 * Backend Origin Resolution for BFF Routes
 * 
 * Render-Only: Only Render origins are allowed (no localhost).
 * Allowed origins:
 * - https://vah-api.onrender.com (production)
 * - https://vah-api-staging.onrender.com (staging)
 */

// Render-only allowlist
const ALLOWED = new Set([
  'https://vah-api.onrender.com',
  'https://vah-api-staging.onrender.com',
]);

// Log once per server process
let didLog = false;

/**
 * Normalises an origin URL by trimming whitespace and removing trailing slashes.
 * 
 * @param origin The origin URL to normalise
 * @returns The normalised origin URL
 */
function normalise(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Validates that the origin is in the Render allowlist.
 * 
 * @param origin The origin URL to validate
 * @param envVarName The name of the environment variable being validated (for error messages)
 * @throws Error if origin is not in allowlist
 */
function validateRenderOrigin(origin: string, envVarName: string): void {
  if (!ALLOWED.has(origin)) {
    throw new Error(
      `Invalid ${envVarName}: must be Render origin. ` +
      `Got: ${origin}. ` +
      `Allowed: ${Array.from(ALLOWED).join(', ')}`
    );
  }
}

/**
 * Gets the backend API origin URL for BFF routes.
 * 
 * Production (NODE_ENV === 'production'):
 * - Requires NEXT_PUBLIC_BACKEND_API_ORIGIN
 * - Must be Render origin (allowlisted)
 * - Throws error if missing or invalid
 * - No fallbacks
 * 
 * Non-production:
 * - Prefers NEXT_PUBLIC_BACKEND_API_ORIGIN (must be allowlisted)
 * - Falls back to NEXT_PUBLIC_API_URL (legacy, warns, must be allowlisted)
 * - Falls back to staging Render origin (warns)
 * 
 * @returns The backend origin URL (without trailing slash)
 * @throws Error if:
 *   - Production: NEXT_PUBLIC_BACKEND_API_ORIGIN is not set
 *   - Origin is not in Render allowlist
 */
export function getBackendOrigin(): string {
  const isProduction = process.env.NODE_ENV === 'production';

  // Production: Require NEXT_PUBLIC_BACKEND_API_ORIGIN (no fallbacks)
  if (isProduction) {
    if (!process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN) {
      const error = new Error('NEXT_PUBLIC_BACKEND_API_ORIGIN is not set. Please configure this environment variable in your deployment settings.');
      if (!didLog) {
        console.error('[backendOrigin] PRODUCTION ERROR:', error.message);
        console.error('[backendOrigin] Allowed origins:', Array.from(ALLOWED).join(', '));
        didLog = true;
      }
      throw error;
    }

    const origin = normalise(process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN);
    try {
      validateRenderOrigin(origin, 'NEXT_PUBLIC_BACKEND_API_ORIGIN');
    } catch (validationError) {
      const error = new Error(
        `Invalid NEXT_PUBLIC_BACKEND_API_ORIGIN: ${validationError instanceof Error ? validationError.message : 'must be Render origin'}`
      );
      if (!didLog) {
        console.error('[backendOrigin] PRODUCTION ERROR:', error.message);
        console.error('[backendOrigin] Allowed origins:', Array.from(ALLOWED).join(', '));
        didLog = true;
      }
      throw error;
    }

    if (!didLog) {
      console.log(`[backendOrigin] Using NEXT_PUBLIC_BACKEND_API_ORIGIN: ${origin}`);
      didLog = true;
    }
    return origin;
  }

  // Non-production: Prefer NEXT_PUBLIC_BACKEND_API_ORIGIN
  if (process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN) {
    const origin = normalise(process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN);
    validateRenderOrigin(origin, 'NEXT_PUBLIC_BACKEND_API_ORIGIN');

    if (!didLog) {
      console.log(`[backendOrigin] Using NEXT_PUBLIC_BACKEND_API_ORIGIN: ${origin}`);
      didLog = true;
    }
    return origin;
  }

  // Non-production: Fallback to NEXT_PUBLIC_API_URL (legacy, warn)
  if (process.env.NEXT_PUBLIC_API_URL) {
    const origin = normalise(process.env.NEXT_PUBLIC_API_URL);
    validateRenderOrigin(origin, 'NEXT_PUBLIC_API_URL');

    if (!didLog) {
      console.warn(
        `[backendOrigin] Using NEXT_PUBLIC_API_URL (legacy). ` +
        `Consider using NEXT_PUBLIC_BACKEND_API_ORIGIN instead: ${origin}`
      );
      didLog = true;
    }
    return origin;
  }

  // Non-production: Fallback to staging Render origin (warn)
  const fallback = 'https://vah-api-staging.onrender.com';
  if (!didLog) {
    console.warn(
      `[backendOrigin] No NEXT_PUBLIC_BACKEND_API_ORIGIN set. Using staging fallback: ${fallback}`
    );
    didLog = true;
  }
  return fallback;
}

/**
 * Gets the backend origin and the source environment variable used.
 * 
 * @returns Object with origin and origin_source
 */
export function getBackendOriginWithSource(): { origin: string; origin_source: string } {
  const isProduction = process.env.NODE_ENV === 'production';

  // Production: Require NEXT_PUBLIC_BACKEND_API_ORIGIN (no fallbacks)
  if (isProduction) {
    if (!process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN) {
      throw new Error('NEXT_PUBLIC_BACKEND_API_ORIGIN is not set');
    }
    const origin = normalise(process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN);
    validateRenderOrigin(origin, 'NEXT_PUBLIC_BACKEND_API_ORIGIN');
    return { origin, origin_source: 'NEXT_PUBLIC_BACKEND_API_ORIGIN' };
  }

  // Non-production: Prefer NEXT_PUBLIC_BACKEND_API_ORIGIN
  if (process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN) {
    const origin = normalise(process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN);
    validateRenderOrigin(origin, 'NEXT_PUBLIC_BACKEND_API_ORIGIN');
    return { origin, origin_source: 'NEXT_PUBLIC_BACKEND_API_ORIGIN' };
  }

  // Non-production: Fallback to NEXT_PUBLIC_API_URL (legacy)
  if (process.env.NEXT_PUBLIC_API_URL) {
    const origin = normalise(process.env.NEXT_PUBLIC_API_URL);
    validateRenderOrigin(origin, 'NEXT_PUBLIC_API_URL');
    return { origin, origin_source: 'NEXT_PUBLIC_API_URL (legacy)' };
  }

  // Non-production: Fallback to staging Render origin
  return { origin: 'https://vah-api-staging.onrender.com', origin_source: 'fallback (staging)' };
}

/**
 * Asserts that backend origin is configured.
 * 
 * @returns The backend origin URL (same as getBackendOrigin)
 * @throws Error if backend origin cannot be resolved or is invalid
 */
export function assertBackendOrigin(): string {
  return getBackendOrigin();
}
