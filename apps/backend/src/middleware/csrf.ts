import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens using the Double Submit Cookie pattern
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF protection for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF protection for auth endpoints (they have their own protection)
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }

  const requestToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies.vah_csrf_token;

  if (!requestToken || !cookieToken) {
    return res.status(403).json({
      ok: false,
      error: 'csrf_token_missing',
      message: 'CSRF token is required for this request'
    });
  }

  if (requestToken !== cookieToken) {
    return res.status(403).json({
      ok: false,
      error: 'csrf_token_mismatch',
      message: 'CSRF token validation failed'
    });
  }

  next();
}
