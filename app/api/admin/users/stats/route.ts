import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const target = `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/admin/users/stats`;

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
      credentials: 'include',
      cache: 'no-store',
    });

    const text = await res.text();
    const out = new NextResponse(text, { status: res.status });
    const ct = res.headers.get('content-type');
    if (ct) out.headers.set('content-type', ct);

    // Copy ALL cookies (split combined header safely)
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      for (const c of setCookie.split(/,(?=\s*[A-Za-z0-9_\-]+=)/)) {
        out.headers.append('set-cookie', c);
      }
    }
    return out;
  } catch (error) {
    console.error('Error proxying user stats to backend:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats from backend' }, { status: 500 });
  }
}