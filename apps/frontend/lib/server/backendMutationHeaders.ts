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
