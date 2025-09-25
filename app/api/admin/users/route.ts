import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qs = url.searchParams.toString();
    const target = `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/admin/users${qs ? `?${qs}` : ''}`;

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
    console.error('Error proxying to backend:', error);
    return NextResponse.json({ error: 'Failed to fetch users from backend' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const target = `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/admin/users`;

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
    console.error('Error proxying POST to backend:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}