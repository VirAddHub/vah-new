import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * BFF endpoint for forwarding requests
 * Proxies to backend /api/forwarding/requests with CSRF protection
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/bff/forwarding/requests';
  let backendBase = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendBase = backend;

    const response = await fetch(`${backend}/api/forwarding/requests`, {
      headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
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

export async function POST(request: NextRequest) {
  const routePath = '/api/bff/forwarding/requests';
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
    let csrfToken: string | null = null;
    if (cookie) {
      const m = cookie.match(/(?:^|;\s*)vah_csrf_token=([^;]+)/);
      if (m?.[1]) {
        try {
          csrfToken = decodeURIComponent(m[1]);
        } catch {
          csrfToken = m[1];
        }
      }
    }

    // If CSRF token is missing, fetch it first by making a GET request to ensure token cookie is set
    if (!csrfToken) {
      // No CSRF token in cookie - make a GET request first to get the token
      try {
        const csrfResponse = await fetch(`${backend}/api/auth/whoami`, {
          method: 'GET',
          headers: { 'Cookie': cookie },
        });
        // Extract CSRF token from Set-Cookie header in response
        const setCookieHeader = csrfResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          const csrfMatch = setCookieHeader.match(/vah_csrf_token=([^;]+)/);
          if (csrfMatch?.[1]) {
            csrfToken = decodeURIComponent(csrfMatch[1]);
            // Also update the cookie string for the POST request
            const updatedCookie = cookie ? `${cookie}; vah_csrf_token=${csrfToken}` : `vah_csrf_token=${csrfToken}`;
            headers.set('Cookie', updatedCookie);
          }
        }
      } catch (csrfError) {
        console.warn(`[${routePath}] Failed to fetch CSRF token, proceeding without it:`, csrfError);
      }
    }

    // Add CSRF token to header if we have it
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }

    const response = await fetch(`${backend}/api/forwarding/requests`, {
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

    // Forward Set-Cookie headers from backend to client so CSRF token cookie is set
    const responseHeaders = new Headers();
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders.set('set-cookie', setCookie);
    }

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || 'unknown_error', details: data },
        { status: response.status, headers: responseHeaders }
      );
    }

    return NextResponse.json(data, { status: response.status, headers: responseHeaders });
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

