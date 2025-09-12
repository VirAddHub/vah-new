import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { number: string } }) {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return NextResponse.json({ error: 'Missing Companies House key' }, { status: 500 });

  const num = params.number;
  const url = `https://api.company-information.service.gov.uk/company/${encodeURIComponent(num)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return NextResponse.json({ error: 'CH profile failed', status: res.status, body: txt }, { status: 502 });
  }

  const p = await res.json();

  const addr = p.registered_office_address ?? {};
  const normalized = {
    company_name: p.company_name,
    company_number: p.company_number,
    company_status: p.company_status,
    date_of_creation: p.date_of_creation,
    sic_codes: p.sic_codes ?? [],
    address: {
      line1: addr.address_line_1 ?? addr.premises ?? '',
      line2: addr.address_line_2 ?? '',
      city: addr.locality ?? '',
      county: addr.region ?? '',
      postcode: addr.postal_code ?? '',
      country: addr.country ?? 'United Kingdom',
    },
  };

  return NextResponse.json(normalized);
}
