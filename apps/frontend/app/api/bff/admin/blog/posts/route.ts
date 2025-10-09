export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';

const ORIGIN = process.env.BACKEND_API_ORIGIN!; // e.g. https://vah-api-staging.onrender.com/api

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const hdrs = nextHeaders();
    const cookie = hdrs.get('cookie') || '';

    const r = await fetch(`${ORIGIN}/admin/blog/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify(body),
      // do NOT use credentials:'include' on server fetch; pass cookie header instead
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
    return NextResponse.json({ ok: false, error: e?.message || 'proxy_error' }, { status: 502 });
  }
}

