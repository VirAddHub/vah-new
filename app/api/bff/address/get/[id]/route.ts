// App Router BFF: GET /api/bff/address/get/:id
// Exchanges autocomplete ID for a full UK address object.
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GETADDRESS_API_KEY!;
const BASE = 'https://api.getaddress.io';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Server missing GETADDRESS_API_KEY' }, { status: 500 });
    }
    const id = decodeURIComponent(params.id || '');
    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400, headers: secHeaders() });
    }

    const url = `${BASE}/get/${encodeURIComponent(id)}?api-key=${API_KEY}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'upstream_error', status: res.status, body: text.slice(0, 500) },
        { status: 502, headers: secHeaders() }
      );
    }

    const data = await res.json();

    // Typical shape returned by GetAddress /get/:id:
    // { line_1, line_2, line_3, town_or_city, county, postcode, country }
    // Normalise into your internal model:
    const normalized = {
      line1: data.line_1 || '',
      line2: data.line_2 || '',
      line3: data.line_3 || '',
      city: data.town_or_city || '',
      county: data.county || '',
      postcode: data.postcode || '',
      country: data.country || 'United Kingdom',
      // Combine helpful variants for display
      formatted: [
        data.line_1, data.line_2, data.line_3, data.town_or_city, data.county, data.postcode,
      ].filter(Boolean).join(', '),
    };

    return NextResponse.json({ address: normalized }, { headers: secHeaders() });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'internal_error', message: err?.message || 'Unknown error' },
      { status: 500, headers: secHeaders() }
    );
  }
}

function secHeaders() {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
  };
}
