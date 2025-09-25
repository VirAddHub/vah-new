import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.text();
    const target = `${API_BASE}/api/admin/users/${params.id}/restore`;

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
    console.error('Error proxying restore to backend:', error);
    return NextResponse.json({ error: 'Failed to restore user from backend' }, { status: 500 });
  }
}