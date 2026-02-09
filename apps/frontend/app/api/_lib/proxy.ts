export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

const ORIGIN = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN; // no non-null bang

export async function proxy(req: NextRequest, targetPath: string) {
  // Emit a header so you can see what target we're using in Network tab
  if (!ORIGIN) {
    const hint = { message: 'Missing NEXT_PUBLIC_BACKEND_API_ORIGIN', env: process.env.VERCEL_ENV || 'unknown' };
    console.error('[proxy] NEXT_PUBLIC_BACKEND_API_ORIGIN missing for env', hint.env);
    return new NextResponse(JSON.stringify(hint), {
      status: 500,
      headers: { 'content-type': 'application/json', 'x-proxy-missing-origin': '1' },
    });
  }

  const url = new URL(req.url);
  // Normalize ORIGIN to remove trailing /api if present
  const normalizedOrigin = ORIGIN.replace(/\/api\/?$/, '');
  // Ensure targetPath includes /api prefix (backend routes are mounted at /api/admin/...)
  const apiPath = targetPath.startsWith('/api/') ? targetPath : `/api${targetPath}`;
  const target = `${normalizedOrigin}${apiPath}${url.search}`;

  // Build outbound request
  const headers = new Headers();
  const cookie = req.headers.get('cookie'); if (cookie) headers.set('cookie', cookie);
  const ct = req.headers.get('content-type'); if (ct) headers.set('content-type', ct);
  const auth = req.headers.get('authorization'); if (auth) headers.set('authorization', auth);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  // CSRF: Double-submit cookie pattern
  // Backend expects X-CSRF-Token header to match vah_csrf_token cookie.
  // Since browsers only talk to BFF, we set the header server-side when proxying.
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
    console.error('[proxy:fetch-throw]', { target, error: errorMessage });
    return NextResponse.json({ message: 'Upstream fetch failed', target }, { status: 502, headers: { 'x-proxy-target': target } });
  }

  if (!r.ok) {
    let body = '';
    try { body = await r.clone().text(); } catch { }
    console.error('[proxy:error]', { target, status: r.status, body });
  }

  const resp = new NextResponse(r.body, { status: r.status, statusText: r.statusText });
  resp.headers.set('x-proxy-target', target); // shows up in response headers

  // pass headers & multiple Set-Cookie
  const setCookies: string[] = [];
  r.headers.forEach((val, key) => {
    const k = key.toLowerCase();
    if (k === 'set-cookie') { setCookies.push(val); return; }
    if (/^(content-type|x-|ratelimit-|link|vary)$/i.test(key)) resp.headers.set(key, val);
    // Skip cache-control from backend - we override it below
  });
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