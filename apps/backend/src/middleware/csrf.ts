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
import { isSecureEnv } from '../lib/cookies';
import { safeAccessPath } from '../lib/accessLog';
import { logger } from '../lib/logger';

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
export function getOrCreateCsrfToken(req: Request, res: Response): string {
  const existingToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];

  if (existingToken && typeof existingToken === 'string' && existingToken.length === 64) {
    return existingToken;
  }

  // Generate new token
  const newToken = generateCsrfToken();

  // Align Secure / SameSite with `vah_session` (see lib/cookies.ts isSecureEnv — includes COOKIE_SECURE).
  const secure = isSecureEnv();
  res.cookie(CSRF_TOKEN_COOKIE_NAME, newToken, {
    httpOnly: false, // Client needs to read this for Double Submit pattern
    secure,
    sameSite: secure ? 'none' : 'lax',
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

  // Resolve full path (app may mount this middleware at '/api', so req.path can be '/auth/login')
  const fullPath = String(req.originalUrl || req.path || '').split('?')[0];

  // If the request has no session cookie, it's not an authenticated browser session yet.
  // CSRF protection is only meaningful once a session cookie exists.
  if (!req.cookies?.vah_session) {
    return next();
  }

  // Skip CSRF for webhook/internal endpoints (they use their own signature-based auth)
  // IMPORTANT: Do NOT add broad path prefixes here — only exact webhook/internal paths.
  if (
    fullPath.startsWith('/api/webhooks/') ||
    fullPath.startsWith('/api/internal/') ||
    // Migrate webhook: machine secret in Authorization / X-Migrate-Webhook-Secret (see webhook-migrate.ts).
    // Route is unmounted in production; CSRF is not used as protection for this POST.
    fullPath === '/api/webhook/migrate'
  ) {
    return next();
  }

  // Skip CSRF for CSP report endpoint (browser sends POST without our session/CSRF; rate-limited)
  if (fullPath === '/api/csp-report') {
    return next();
  }

  // Note: /api/admin routes are intentionally NOT excluded — admin mutations must pass CSRF
  // checks the same as any other authenticated browser session.

  // Skip CSRF for auth endpoints (login/signup/password reset/logout) so BFF/browser flows work
  // without a prior CSRF header (login); logout often omits X-CSRF-Token in the same way.
  // Note: these are still protected by rate limiting; session cookie still required for logout.
  if (
    fullPath === '/api/auth/login' ||
    fullPath === '/api/auth/logout' ||
    fullPath === '/api/auth/signup' ||
    fullPath === '/api/auth/reset-password/confirm' ||
    fullPath === '/api/profile/reset-password-request' ||
    fullPath === '/api/profile/reset-password'
  ) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];

  // Get token from header
  const headerToken = req.headers[CSRF_TOKEN_HEADER_NAME.toLowerCase()] as string | undefined;

  // Validate both tokens exist and match
  if (!cookieToken || !headerToken) {
    logger.warn('[csrf] token_missing', {
      path: safeAccessPath(req),
      method: req.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });
    return res.status(403).json({
      ok: false,
      error: 'csrf_token_missing',
      message: 'CSRF token is required for this request'
    });
  }

  const a = Buffer.from(cookieToken, 'utf8');
  const b = Buffer.from(headerToken, 'utf8');
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    logger.warn('[csrf] token_mismatch', {
      path: safeAccessPath(req),
      method: req.method,
      cookieLength: cookieToken?.length,
      headerLength: headerToken?.length,
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
