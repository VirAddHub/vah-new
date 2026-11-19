/**
 * Headers for state-changing requests to the Express API.
 * When `vah_session` is present, the backend requires a matching X-CSRF-Token
 * (double-submit cookie). Fetch token via GET /api/csrf with the same Cookie header.
 */
export async function buildBackendMutationHeaders(
  backendOrigin: string,
  cookie: string,
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  let csrfToken: string | null = null;
  try {
    const csrfResponse = await fetch(`${backendOrigin}/api/csrf`, {
      method: 'GET',
      headers: { Cookie: cookie },
      cache: 'no-store',
    });
    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      csrfToken = csrfData.csrfToken ?? null;
    }
  } catch {
    // CSRF fetch failed; downstream may return csrf_token_missing
  }

  return {
    Cookie: cookie,
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...extra,
  };
}

/**
 * The CSRF header for a state-changing request forwarded to the API on behalf of a signed-in
 * browser: the double-submit token is the browser's own `vah_csrf_token` cookie. Without it the
 * API answers 403 csrf_token_missing for every signed-in POST/PATCH/DELETE (this broke starting
 * identity checks, subscription actions, controller answers and server-side logout).
 */
export function csrfHeaderFromCookie(cookie: string): Record<string, string> {
  const m = cookie.match(/(?:^|;\s*)vah_csrf_token=([^;]+)/);
  if (!m) return {};
  let token = m[1];
  try { token = decodeURIComponent(token); } catch { /* keep raw value */ }
  return { 'X-CSRF-Token': token };
}
