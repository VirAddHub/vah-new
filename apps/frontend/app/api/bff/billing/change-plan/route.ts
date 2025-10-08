import { NextRequest, NextResponse } from 'next/server';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
export async function POST(req: NextRequest) {
  const r = await fetch(`${API_BASE}/api/billing/change-plan`, {
    method: 'POST', 
    headers: { 
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') ?? '' 
    },
    credentials: 'include',
    body: await req.text()
  });
  return new NextResponse(await r.text(), { status: r.status, headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/json' }});
}
