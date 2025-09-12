import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GETADDRESS_API_KEY; // set in Render
export const dynamic = 'force-dynamic';

type NormalizedAddress = {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: 'United Kingdom';
  raw?: unknown;
};

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'address_api_not_configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const postcode = searchParams.get('postcode')?.trim().toUpperCase();
  const building = searchParams.get('building')?.trim();

  if (!postcode) {
    return NextResponse.json({ error: 'postcode_required' }, { status: 400 });
  }

  // getAddress.io endpoint — `expand=true` returns structured fields
  const path =
    building && building.length
      ? `find/${encodeURIComponent(postcode)}/${encodeURIComponent(building)}`
      : `find/${encodeURIComponent(postcode)}`;

  const url = `https://api.getaddress.io/${path}?api-key=${API_KEY}&expand=true`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });

  if (!res.ok) {
    return NextResponse.json({ error: 'upstream_error', status: res.status }, { status: 502 });
  }

  const json = await res.json();
  const list = (json.addresses ?? json) as any[];

  const addresses: NormalizedAddress[] = list.map((a: any) => ({
    line1:
      a.line_1 ||
      a.thoroughfare ||
      a.building_name ||
      a.sub_building_name ||
      '',
    line2: a.line_2 || a.dependent_locality || '',
    city: a.town_or_city || a.post_town || '',
    county: a.county || '',
    postcode: a.postcode || json.postcode || postcode,
    country: 'United Kingdom',
    raw: a,
  }));

  return NextResponse.json({ postcode, addresses });
}
