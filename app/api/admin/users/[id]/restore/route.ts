import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.text();
    const target = `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/admin/users/${params.id}/restore`;

    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
      body,
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
    console.error('Error proxying restore to backend:', error);
    return NextResponse.json({ error: 'Failed to restore user from backend' }, { status: 500 });
  }
}