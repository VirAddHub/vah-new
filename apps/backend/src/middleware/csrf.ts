/**
 * CSRF Protection Middleware
 * 
 * Implements Double Submit Cookie pattern for CSRF protection.
 * Since we use SameSite: 'none' cookies for cross-domain support,
 * we need additional CSRF protection.
 * 
 * How it works:
 * 1. Server generates a CSRF token and sets it in a cookie (httpOnly: false so JS can read it)
 * 2. Client must include this token in a header (X-CSRF-Token) for state-changing requests
 * 3. Server validates that cookie token matches header token
 * 
 * This prevents CSRF attacks because:
 * - Malicious sites cannot read the cookie (SameSite: 'none' still requires secure context)
 * - Even if they could, they cannot set custom headers due to CORS
 * - The token must match between cookie and header
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_TOKEN_COOKIE_NAME = 'vah_csrf_token';
const CSRF_TOKEN_HEADER_NAME = 'X-CSRF-Token';
const CSRF_TOKEN_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

/**
 * Generate a secure random CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create CSRF token for the current session
 * Sets cookie if not present, returns existing token if present
 */
function getOrCreateCsrfToken(req: Request, res: Response): string {
  const existingToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];

  if (existingToken && typeof existingToken === 'string' && existingToken.length === 64) {
    return existingToken;
  }

  // Generate new token
  const newToken = generateCsrfToken();

  // Set cookie (not httpOnly so client JS can read it for Double Submit pattern)
  // Secure and SameSite: 'none' to match session cookie
  const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
  res.cookie(CSRF_TOKEN_COOKIE_NAME, newToken, {
    httpOnly: false, // Client needs to read this for Double Submit pattern
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
    maxAge: CSRF_TOKEN_MAX_AGE * 1000
  });

  return newToken;
}

/**
 * CSRF protection middleware for state-changing requests
 * 
 * State-changing methods: POST, PATCH, PUT, DELETE
 * 
 * Validates that:
 * 1. CSRF token exists in cookie
 * 2. CSRF token is provided in X-CSRF-Token header
 * 3. Cookie token matches header token
 * 
 * Exceptions:
 * - GET, HEAD, OPTIONS requests are not protected (idempotent)
 * - Webhook endpoints (they have their own authentication)
 */
export function requireCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Only protect state-changing methods
  const stateChangingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for webhook endpoints (they have their own auth)
  if (req.path.startsWith('/api/webhooks/') || req.path.startsWith('/api/internal/')) {
    return next();
  }

  // Skip CSRF for public endpoints that don't change state
  // (e.g., password reset requests - they're rate-limited and have their own tokens)
  if (req.path === '/api/auth/password-reset/request' || req.path === '/api/auth/password-reset/confirm') {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];

  // Get token from header
  const headerToken = req.headers[CSRF_TOKEN_HEADER_NAME.toLowerCase()] as string | undefined;

  // Validate both tokens exist and match
  if (!cookieToken || !headerToken) {
    console.warn('[CSRF] Missing token', {
      path: req.path,
      method: req.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken
    });
    return res.status(403).json({
      ok: false,
      error: 'csrf_token_missing',
      message: 'CSRF token is required for this request'
    });
  }

  if (cookieToken !== headerToken) {
    console.warn('[CSRF] Token mismatch', {
      path: req.path,
      method: req.method,
      cookieLength: cookieToken?.length,
      headerLength: headerToken?.length
    });
    return res.status(403).json({
      ok: false,
      error: 'csrf_token_invalid',
      message: 'CSRF token validation failed'
    });
  }

  // Token is valid - continue
  next();
}

/**
 * Middleware to ensure CSRF token cookie is set
 * Call this on all requests to ensure token is available for client
 */
export function ensureCsrfToken(req: Request, res: Response, next: NextFunction) {
  getOrCreateCsrfToken(req, res);
  next();
}
