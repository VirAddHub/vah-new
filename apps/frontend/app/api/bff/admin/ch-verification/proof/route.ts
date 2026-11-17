import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/app/api/_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The customer's uploaded Companies House proof, for the reviewing administrator (admin only, enforced by the API). */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || '';
  if (!/^\d+$/.test(userId)) return NextResponse.json({ ok: false, error: 'invalid_user_id' }, { status: 400 });
  const url = new URL(req.url); url.search = '';
  return proxy(new NextRequest(url, { headers: req.headers, method: 'GET' }), `/admin/ch-verification/${userId}/proof`);
}
