import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const backend = `${BACKEND_BASE}/api/auth/login`;
    
    const resp = await fetch(backend, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://vah-frontend-final.vercel.app',
      },
      body,
      // Server-to-server call, no credentials needed
    });

    const data = await resp.text();
    const out = new NextResponse(data, {
      status: resp.status,
      headers: { 
        'Content-Type': resp.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    // Pass Set-Cookie to the browser
    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) {
      out.headers.set('set-cookie', setCookie);
    }

    return out;
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { ok: false, error: 'Login service unavailable' },
      { status: 500 }
    );
  }
}
