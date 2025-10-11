import { NextRequest, NextResponse } from 'next/server';

const ORIGIN = process.env.BACKEND_API_ORIGIN!; // e.g. https://vah-api-staging.onrender.com/api

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postcode = searchParams.get('postcode') || '';
  const line1 = searchParams.get('line1') || '';
  const url = `${ORIGIN}/address?postcode=${encodeURIComponent(postcode)}&line1=${encodeURIComponent(line1)}`;

  const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { 'content-type': 'application/json' } });
}
