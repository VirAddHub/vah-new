export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

const ORIGIN = process.env.NEXT_PUBLIC_API_URL || "";

function buildUrl(path: string) {
  // absolute if ORIGIN set, else relative to this frontend origin (vercel proxy or local dev)
  if (!ORIGIN || ORIGIN === "/") return path.startsWith("/") ? path : `/${path}`;
  const base = ORIGIN.replace(/\/+$/, "");
  const tail = path.startsWith("/") ? path : `/${path}`;
  return `${base}${tail}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookieHeader = req.headers.get('cookie');

    // Debug logging
    console.log('[BFF] Cookie header:', cookieHeader);
    console.log('[BFF] Request headers:', Object.fromEntries(req.headers.entries()));

    // Use the same buildUrl pattern as other working routes
    const targetUrl = buildUrl('/api/admin/blog/posts');

    console.log('[BFF] Target URL:', targetUrl);

    const r = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader || '',
        'User-Agent': 'vah-bff'
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    console.log('[BFF] Response status:', r.status);
    console.log('[BFF] Response headers:', Object.fromEntries(r.headers.entries()));

    const text = await r.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

    console.log('[BFF] Response body:', json);

    // Normalise to { ok, data, error }
    const ok = (json?.ok === true) || (json?.success === true) || r.ok;
    const data = json?.data ?? json?.result ?? null;
    const error = json?.error ?? (!ok ? `upstream_${r.status}` : null);

    return NextResponse.json({ ok, data, error }, { status: ok ? 200 : 502 });
  } catch (e: any) {
    console.error('[BFF] Error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'proxy_error' }, { status: 502 });
  }
}

