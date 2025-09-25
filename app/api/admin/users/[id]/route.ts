import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const target = `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/admin/users/${params.id}`;

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
    console.error('Error proxying GET to backend:', error);
    return NextResponse.json({ error: 'Failed to fetch user from backend' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.text();
    const target = `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/admin/users/${params.id}`;

    const res = await fetch(target, {
      method: 'PUT',
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
    console.error('Error proxying PUT to backend:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const target = `${process.env.NEXT_PUBLIC_BACKEND_BASE}/api/admin/users/${params.id}`;
    
    const res = await fetch(target, {
      method: 'DELETE',
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
      credentials: 'include',
      cache: 'no-store',
    });

    // Some backends return 204 No Content; normalize to JSON for the UI
    if (res.status === 204) {
      return NextResponse.json({ ok: true, data: { deleted: 1 } }, { status: 200 });
    }

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
    console.error('Error proxying DELETE to backend:', error);
    return NextResponse.json({ error: 'Failed to delete user from backend' }, { status: 500 });
  }
}