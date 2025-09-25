import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/auth/whoami`, {
      method: 'GET',
      headers: { 
        'content-type': req.headers.get('content-type') || 'application/json',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
      credentials: 'include',
    });

    const text = await resp.text();
    const out = new NextResponse(text, { status: resp.status });
    const ct = resp.headers.get('content-type');
    if (ct) out.headers.set('content-type', ct);

    // Copy ALL cookies (split combined header safely)
    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) {
      for (const c of setCookie.split(/,(?=\s*[A-Za-z0-9_\-]+=)/)) {
        out.headers.append('set-cookie', c);
      }
    }
    return out;
  } catch (error) {
    console.error('Whoami proxy error:', error);
    return NextResponse.json(
      { ok: false, error: 'Authentication service unavailable' },
      { status: 500 }
    );
  }
}