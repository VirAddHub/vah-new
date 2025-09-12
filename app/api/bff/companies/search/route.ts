import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ items: [] });

  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return NextResponse.json({ error: 'Missing Companies House key' }, { status: 500 });

  const url = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(q)}&items_per_page=10`;

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
    // never cache search suggestions
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return NextResponse.json({ error: 'CH search failed', status: res.status, body: txt }, { status: 502 });
  }

  const data = await res.json();
  const items = (data.items ?? []).map((i: any) => ({
    company_number: i.company_number,
    title: i.title,
    address: i.address_snippet,
    status: i.company_status,
    kind: i.kind,
  }));

  return NextResponse.json({ items });
}
