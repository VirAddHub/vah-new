import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    const u = new URL(req.url);
    const postcode = u.searchParams.get('postcode') || '';
    const line1 = u.searchParams.get('line1') || '';

    // Build backend URL - backend origin should NOT include /api
    const url = `${backend}/api/address/lookup?postcode=${encodeURIComponent(postcode)}&line1=${encodeURIComponent(line1)}`;

    const r = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cookie': cookie,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Read response as text first
    const raw = await r.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw: raw.substring(0, 300) };
    }

    if (r.ok) {
      return NextResponse.json(data, { status: r.status });
    } else {
      return NextResponse.json(
        { ok: false, error: data?.error || 'Address lookup failed', status: r.status, details: data },
        { status: r.status }
      );
    }
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF address lookup] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF address lookup] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Backend connection failed' },
      { status: 502 }
    );
  }
}
