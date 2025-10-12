import { NextRequest, NextResponse } from 'next/server';

const ORIGIN = process.env.BACKEND_API_ORIGIN!; // e.g. https://vah-api-staging.onrender.com

export async function GET(req: NextRequest) {
  console.log('[BFF] Address lookup request started');

  const u = new URL(req.url);
  const postcode = u.searchParams.get('postcode') || '';
  const line1 = u.searchParams.get('line1') || '';

  console.log('[BFF] Request params:', { postcode, line1 });
  console.log('[BFF] BACKEND_API_ORIGIN:', process.env.BACKEND_API_ORIGIN);

  const url = `${ORIGIN}/api/address/lookup?postcode=${encodeURIComponent(postcode)}&line1=${encodeURIComponent(line1)}`;
  console.log('[BFF] Backend URL:', url);

  try {
    const r = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    console.log('[BFF] Backend response status:', r.status);
    console.log('[BFF] Backend response headers:', Object.fromEntries(r.headers.entries()));

    const body = await r.text();
    console.log('[BFF] Backend response body:', body);

    return new NextResponse(body, { status: r.status, headers: { 'content-type': 'application/json' } });
  } catch (error) {
    console.error('[BFF] Error calling backend:', error);
    return new NextResponse(JSON.stringify({ ok: false, error: 'Backend connection failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }
}
