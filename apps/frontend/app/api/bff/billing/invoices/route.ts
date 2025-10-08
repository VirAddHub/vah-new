import { NextRequest, NextResponse } from 'next/server';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search;
  const r = await fetch(`${API_BASE}/api/billing/invoices${qs}`, {
    headers: { cookie: req.headers.get('cookie') ?? '' }, credentials: 'include', cache: 'no-store'
  });
  return new NextResponse(await r.text(), { status: r.status, headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/json' } });
}
