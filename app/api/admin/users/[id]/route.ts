import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const target = `${API_BASE}/api/admin/users/${params.id}`;

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        Origin: process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://vah-frontend-final.vercel.app',
        Cookie: req.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('Error proxying GET to backend:', error);
    return NextResponse.json({ error: 'Failed to fetch user from backend' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.text();
    const target = `${API_BASE}/api/admin/users/${params.id}`;

    const res = await fetch(target, {
      method: 'PUT',
      headers: {
        Origin: process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://vah-frontend-final.vercel.app',
        Cookie: req.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('Error proxying PUT to backend:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const target = `${API_BASE}/api/admin/users/${params.id}`;
    
    const res = await fetch(target, {
      method: 'DELETE',
      headers: {
        Origin: process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://vah-frontend-final.vercel.app',
        Cookie: req.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    // Some backends return 204 No Content; normalize to JSON for the UI
    if (res.status === 204) {
      return NextResponse.json({ ok: true, data: { deleted: 1 } }, { status: 200 });
    }

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 
        'content-type': res.headers.get('content-type') ?? 'application/json' 
      },
    });
  } catch (error) {
    console.error('Error proxying DELETE to backend:', error);
    return NextResponse.json({ error: 'Failed to delete user from backend' }, { status: 500 });
  }
}