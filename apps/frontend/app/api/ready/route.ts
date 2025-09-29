import { NextResponse } from 'next/server';

const ORIGIN = process.env.BACKEND_API_ORIGIN || 'https://vah-api-staging.onrender.com';

export async function GET() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`${ORIGIN.replace(/\/+$/, '')}/api/healthz`, {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const ok = r.ok;
    return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
