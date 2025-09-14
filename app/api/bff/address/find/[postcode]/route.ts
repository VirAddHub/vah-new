// GET /api/bff/address/find/:postcode
// Direct postcode -> list of addresses (expand=true returns richer rows)
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GETADDRESS_API_KEY!;
const BASE = 'https://api.getaddress.io';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { postcode: string } }) {
    try {
        if (!API_KEY) return NextResponse.json({ error: 'missing_key' }, { status: 500 });
        const postcode = (params.postcode || '').trim();
        if (!postcode) return NextResponse.json({ error: 'missing_postcode' }, { status: 400 });

        const url = `${BASE}/find/${encodeURIComponent(postcode)}?api-key=${API_KEY}&expand=true`;
        const res = await fetch(url, { cache: 'no-store' });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            return NextResponse.json(
                { error: 'upstream_error', status: res.status, body: text.slice(0, 500) },
                { status: 502, headers: secHeaders() }
            );
        }

        const data = await res.json();
        // Normalise: map to simple array of { label, parts... }
        const addresses = Array.isArray(data.addresses)
            ? data.addresses.map((a: any) => ({
                label: [a.line_1, a.line_2, a.line_3, a.town_or_city, a.county, a.postcode]
                    .filter(Boolean)
                    .join(', '),
                line1: a.line_1 || '',
                line2: a.line_2 || '',
                line3: a.line_3 || '',
                city: a.town_or_city || '',
                county: a.county || '',
                postcode: a.postcode || '',
                country: a.country || 'United Kingdom',
            }))
            : [];

        return NextResponse.json({ addresses }, { headers: secHeaders() });
    } catch (err: any) {
        return NextResponse.json({ error: 'internal_error', message: err?.message || 'Unknown' }, { status: 500, headers: secHeaders() });
    }
}

function secHeaders() {
    return {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
    };
}
