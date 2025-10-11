import { NextRequest, NextResponse } from 'next/server';

const ORIGIN = process.env.BACKEND_API_ORIGIN!; // e.g. https://vah-api-staging.onrender.com

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const postcode = u.searchParams.get('postcode') || '';
  const line1 = u.searchParams.get('line1') || '';
  const url = `${ORIGIN}/api/address/lookup?postcode=${encodeURIComponent(postcode)}&line1=${encodeURIComponent(line1)}`;

  const r = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
  const body = await r.text();
  return new NextResponse(body, { status: r.status, headers: { 'content-type': 'application/json' } });
}
