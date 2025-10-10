export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

const ORIGIN = process.env.BACKEND_API_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN || "";

function buildUrl(path: string) {
  // absolute if ORIGIN set, else relative to this frontend origin (vercel proxy or local dev)
  if (!ORIGIN || ORIGIN === "/") return path.startsWith("/") ? path : `/${path}`;
  const base = ORIGIN.replace(/\/+$/, "");
  const tail = path.startsWith("/") ? path : `/${path}`;
  return `${base}${tail}`;
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookieHeader = req.headers.get('cookie');
    const { slug } = params;

    // Use the same buildUrl pattern as other working routes
    const targetUrl = buildUrl(`/api/admin/blog/posts/${slug}`);

    const r = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader || '',
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

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const { slug } = params;

    // Use the same buildUrl pattern as other working routes
    const targetUrl = buildUrl(`/api/admin/blog/posts/${slug}`);

    const r = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Cookie': cookieHeader || '',
        'User-Agent': 'vah-bff'
      },
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
