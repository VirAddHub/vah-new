import type { Response, CookieOptions } from 'express';

/** True when running behind HTTPS (production/staging or COOKIE_SECURE=true). */
export function isSecureEnv(): boolean {
    if (process.env.NODE_ENV === 'production') return true;
    if (String(process.env.COOKIE_SECURE ?? '').toLowerCase() === 'true') return true;
    return false;
}

/**
 * Returns the correct cookie options for the session/auth cookie.
 *  - Production: SameSite=None, Secure=true (required for cross-site Next.js ↔ API)
 *  - Dev/local:  SameSite=Lax,  Secure=false (HTTP-friendly)
 */
export function sessionCookieOptions(): CookieOptions {
    const secure = isSecureEnv();
    return secure
        ? {
              httpOnly: true,
              secure: true,
              sameSite: 'none' as const,
              path: '/',
              maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          }
        : {
              httpOnly: true,
              secure: false,
              sameSite: 'lax' as const,
              path: '/',
              maxAge: 60 * 60 * 24 * 30, // 30 days
          };
}

export function setAuthCookies(res: Response, token: string): void {
    res.cookie('auth', token, sessionCookieOptions());
}

export function clearAuthCookies(res: Response): void {
    res.clearCookie('auth', { path: '/' });
}

