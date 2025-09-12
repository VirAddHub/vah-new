// App Router BFF: GET /api/bff/address/autocomplete?q=<query>
// Uses GetAddress /autocomplete; server-side key is never exposed.
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GETADDRESS_API_KEY!;
const BASE = 'https://api.getaddress.io';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Server missing GETADDRESS_API_KEY' }, { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] }, {
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    // GetAddress Autocomplete (all=true returns more results)
    const url = `${BASE}/autocomplete/${encodeURIComponent(q)}?api-key=${API_KEY}&all=true`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'upstream_error', status: res.status, body: text.slice(0, 500) },
        { status: 502, headers: secHeaders() }
      );
    }

    const data = await res.json();
    // Normalise: suggestions -> [{ id, label }]
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.map((s: any) => ({ id: s.id, label: s.address }))
      : [];

    return NextResponse.json({ suggestions }, { headers: secHeaders() });
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
