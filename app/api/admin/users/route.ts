import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qs = url.searchParams.toString();
    const target = `${API_BASE}/api/admin/users${qs ? `?${qs}` : ''}`;

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        // Pass Origin to satisfy backend CORS rules
        Origin: process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://vah-frontend-final.vercel.app',
        // Pass cookies through so the admin session is honored
        Cookie: req.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      // Never cache admin data
      cache: 'no-store',
    });

    const body = await res.text(); // stream-safe
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error proxying to backend:', error);
    return NextResponse.json({ error: 'Failed to fetch users from backend' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const target = `${API_BASE}/api/admin/users`;

    const res = await fetch(target, {
      method: 'POST',
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
    console.error('Error proxying POST to backend:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}