import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('src');
  if (!src) return NextResponse.json({ error: 'src required' }, { status: 400 });
  const res = await fetch(src);
  return new NextResponse(res.body, { headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' } });
}
