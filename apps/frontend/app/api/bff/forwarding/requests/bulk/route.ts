import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * BFF endpoint for bulk forwarding requests
 * Proxies to backend /api/forwarding/requests/bulk with CSRF protection
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/forwarding/requests/bulk';
  let backendBase = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendBase = backend;

    const body = await request.text();

    // Build headers for backend request
    const headers = new Headers();
    headers.set('Cookie', cookie);
    headers.set('Content-Type', 'application/json');

    // CSRF: Extract token from cookie and add to header
    // Backend expects X-CSRF-Token header to match vah_csrf_token cookie
    if (cookie) {
      const m = cookie.match(/(?:^|;\s*)vah_csrf_token=([^;]+)/);
      if (m?.[1]) {
        try {
          headers.set('x-csrf-token', decodeURIComponent(m[1]));
        } catch {
          headers.set('x-csrf-token', m[1]);
        }
      }
    }

    const response = await fetch(`${backend}/api/forwarding/requests/bulk`, {
      method: 'POST',
      headers,
      body,
    });

    const raw = await response.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'invalid_response', details: raw.substring(0, 300) },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || 'unknown_error', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[${routePath}] Server misconfigured:`, error);
      return NextResponse.json(
        { ok: false, error: 'server_misconfigured', details: String(error) },
        { status: 500 }
      );
    }

    console.error(`[${routePath}] error:`, error);
    return NextResponse.json(
      { ok: false, error: 'backend_connection_failed' },
      { status: 502 }
    );
  }
}

