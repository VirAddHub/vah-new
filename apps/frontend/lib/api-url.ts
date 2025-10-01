// NEW: Normalize API URLs so /api is included exactly once.
export const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'https://vah-api-staging.onrender.com';

// Call with paths like "auth/login", "auth/whoami", etc. (NO leading /api)
export function apiUrl(path: string): string {
  const base = RAW_API_BASE.replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, ''); // strip leading slash
  // Ensure exactly one `/api` between base and path, and avoid `/api/api/...`
  const hasApiInBase = /\/api$/.test(base);
  const hasApiInPath = /^api(\/|$)/.test(p);
  const joiner = hasApiInBase || hasApiInPath ? '' : '/api';
  return `${base}${joiner}/${p}`;
}

export function assertNoLeadingApi(path: string) {
  if (process.env.NODE_ENV !== 'production' && /^\/?api\//.test(path)) {
    // eslint-disable-next-line no-console
    console.warn('[apiUrl] Pass paths like "auth/login" — not "/api/auth/login". Received:', path);
  }
}
