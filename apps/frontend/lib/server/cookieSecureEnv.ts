/**
 * Mirrors backend `isSecureEnv` (apps/backend/src/lib/cookies.ts) for BFF-synthesized Set-Cookie lines.
 */
export function isCookieSecureDeployment(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (String(process.env.COOKIE_SECURE ?? '').toLowerCase() === 'true') return true;
  if (String(process.env.FORCE_SECURE_COOKIES ?? '').toLowerCase() === 'true') return true;
  return false;
}
