import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || 'https://vah-api-staging.onrender.com';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const backend = `${BACKEND_BASE}/api/auth/whoami`;
    
    const resp = await fetch(backend, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': process.env.NEXT_PUBLIC_FRONTEND_ORIGIN || 'https://vah-frontend-final.vercel.app',
        'Cookie': req.headers.get('cookie') || '',
        'Authorization': req.headers.get('authorization') || '',
      },
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

    // Pass through Set-Cookie headers if any (for session updates)
    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) {
      const cookies = setCookie.split(/,(?=\s*\w+=)/);
      cookies.forEach(cookie => {
        out.headers.append('set-cookie', cookie.trim());
      });
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