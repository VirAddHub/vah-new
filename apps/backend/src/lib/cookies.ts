import type { Response, CookieOptions } from 'express';

/**
 * Session / CSRF cookie security toggles.
 *
 * Trust assumptions: with `sameSite: 'none'` + `credentials: true` CORS, the API allowlist
 * (CORS_ORIGINS / ALLOWED_ORIGINS) must match browser origins that may send cookies. Next BFF
 * logout clearing uses `apps/frontend/lib/server/cookieSecureEnv.ts` — keep `isSecureEnv` and
 * that helper aligned (same env vars: NODE_ENV, COOKIE_SECURE, FORCE_SECURE_COOKIES).
 */

/** True when running behind HTTPS (production/staging or COOKIE_SECURE / FORCE_SECURE_COOKIES). */
export function isSecureEnv(): boolean {
    if (process.env.NODE_ENV === 'production') return true;
    if (String(process.env.COOKIE_SECURE ?? '').toLowerCase() === 'true') return true;
    if (String(process.env.FORCE_SECURE_COOKIES ?? '').toLowerCase() === 'true') return true;
    return false;
}

/**
 * HttpOnly session cookie transport flags (shared by JWT session + refresh + clearCookie).
 * Max age is set per route (rolling JWT vs legacy `auth` cookie).
 */
export function sessionCookieSecurityOptions(): Pick<
    CookieOptions,
    'httpOnly' | 'secure' | 'sameSite' | 'path'
> {
    const secure = isSecureEnv();
    return secure
        ? { httpOnly: true, secure: true, sameSite: 'none' as const, path: '/' }
        : { httpOnly: true, secure: false, sameSite: 'lax' as const, path: '/' };
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
              ...sessionCookieSecurityOptions(),
              maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          }
        : {
              ...sessionCookieSecurityOptions(),
              maxAge: 60 * 60 * 24 * 30, // 30 days
          };
}

export function setAuthCookies(res: Response, token: string): void {
    res.cookie('auth', token, sessionCookieOptions());
}

export function clearAuthCookies(res: Response): void {
    res.clearCookie('auth', { path: '/' });
}

