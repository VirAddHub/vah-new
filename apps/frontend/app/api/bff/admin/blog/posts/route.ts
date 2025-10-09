export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';

const ORIGIN = process.env.BACKEND_API_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN || "";

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
    const hdrs = nextHeaders();
    const cookie = hdrs.get('cookie') || '';

    // Use the same buildUrl pattern as other working routes
    const targetUrl = buildUrl('/api/admin/blog/posts');

    const r = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Cookie': cookie,
        'User-Agent': 'vah-bff'
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await r.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

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

