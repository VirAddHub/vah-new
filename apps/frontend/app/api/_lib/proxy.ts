export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { clientIpHeaders } from "@/lib/server/clientIpHeaders";

export async function proxy(req: NextRequest, targetPath: string) {
  let normalizedOrigin: string;
  try {
    // Same resolution as BFF routes: dev falls back to NEXT_PUBLIC_API_URL or staging Render
    normalizedOrigin = getBackendOrigin().replace(/\/api\/?$/, "");
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Backend API origin is not configured";
    console.error("[proxy] getBackendOrigin failed:", message);
    return new NextResponse(
      JSON.stringify({
        message,
        env: process.env.VERCEL_ENV || "unknown",
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
          "x-proxy-missing-origin": "1",
        },
      }
    );
  }

  const url = new URL(req.url);
  // Ensure targetPath includes /api prefix (backend routes are mounted at /api/admin/...)
  const apiPath = targetPath.startsWith('/api/') ? targetPath : `/api${targetPath}`;
  const target = `${normalizedOrigin}${apiPath}${url.search}`;

  // Build outbound request
  const headers = new Headers();
  const cookie = req.headers.get('cookie'); if (cookie) headers.set('cookie', cookie);
  const ct = req.headers.get('content-type'); if (ct) headers.set('content-type', ct);
  const auth = req.headers.get('authorization'); if (auth) headers.set('authorization', auth);
  headers.set('x-forwarded-host', url.host);
  // Tell the API which visitor this is, signed so the API can trust it for rate limiting.
  // Without BFF_SHARED_SECRET nothing is sent and the API falls back to the connection address.
  for (const [k, v] of Object.entries(clientIpHeaders(req))) headers.set(k, v);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  // CSRF: Double-submit cookie pattern
  // Backend expects X-CSRF-Token header to match vah_csrf_token cookie.
  // Copying the cookie into the header is only safe because middleware.ts has already refused
  // cross-site state-changing requests to /api/* before they reach this proxy (security review F28).
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && cookie) {
    const m = cookie.match(/(?:^|;\s*)vah_csrf_token=([^;]+)/);
    if (m?.[1]) {
      try {
        headers.set('x-csrf-token', decodeURIComponent(m[1]));
      } catch {
        headers.set('x-csrf-token', m[1]);
      }
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
    cache: 'no-store',
    redirect: 'manual',
  };
  
  // Add cache-control headers to prevent backend from returning 304
  headers.set('cache-control', 'no-store');
  headers.set('pragma', 'no-cache');

  let r: Response;
  try {
    r = await fetch(target, init);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error('[proxy:fetch-throw]', { path: apiPath, error: errorMessage });
    return NextResponse.json({ message: 'Upstream fetch failed' }, { status: 502 });
  }

  if (!r.ok && r.status >= 500) {
    // Status and path only: response bodies can contain customer data (security review F09/F17).
    console.error('[proxy:error]', { path: apiPath, status: r.status });
  }

  const resp = new NextResponse(r.body, { status: r.status, statusText: r.statusText });

  // Pass headers. Set-Cookie must be read one cookie at a time: Headers.forEach can join several
  // cookies into one comma-separated value, which the per-cookie rewrite below would corrupt
  // (security review F15). getSetCookie() returns each cookie separately.
  r.headers.forEach((val, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    if (/^(content-type|content-disposition|x-|ratelimit-|link|vary)$/i.test(key)) resp.headers.set(key, val);
    // Skip cache-control from backend - we override it below
  });
  const setCookies: string[] =
    typeof (r.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (r.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : (r.headers.get('set-cookie') ? [r.headers.get('set-cookie') as string] : []);
  for (const c of setCookies) {
    const parts = c.split(';').map(s => s.trim());
    const filtered = parts.filter(p => !/^domain=/i.test(p));
    if (!filtered.some(p => /^samesite=/i.test(p))) filtered.push('SameSite=Lax');
    if (!filtered.some(p => /^path=/i.test(p))) filtered.push('Path=/');
    if (!filtered.some(p => /^secure$/i.test(p) || /^secure=/i.test(p))) filtered.push('Secure');
    resp.headers.append('set-cookie', filtered.join('; '));
  }
  resp.headers.set('Vary', 'Cookie');
  
  // IMPORTANT: Force no-store to prevent 304 responses and browser caching
  resp.headers.set('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  resp.headers.set('pragma', 'no-cache');
  resp.headers.set('expires', '0');

  return resp;
}