import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const target = `${API_BASE}/api/admin/users/stats`;

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        Origin: process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://vah-frontend-final.vercel.app',
        Cookie: req.headers.get('cookie') || '',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });

    const body = await res.text();
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
    console.error('Error proxying user stats to backend:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats from backend' }, { status: 500 });
  }
}