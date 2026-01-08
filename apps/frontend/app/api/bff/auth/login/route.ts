import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/bff/auth/login
 * Proxy login request to backend
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/auth/login';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/auth/login`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store', // Never cache login requests
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.log(`[BFF auth/login] Backend response: ${status} from ${backendUrl}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF auth/login] JSON parse failed for ${status} response:`, parseError);
        return NextResponse.json(
          { 
            ok: false, 
            error: { 
              code: 'BACKEND_NON_JSON', 
              status, 
              body: textPreview 
            } 
          }, 
          { status: 502 }
        );
      }
    }

    // If backend status is not 2xx, return backend error (ensure no-store so it won't be cached)
    if (status < 200 || status >= 300) {
      return NextResponse.json(
        { 
          ok: false, 
          error: json?.error || json?.message || 'Login failed',
          details: json ?? textPreview 
        }, 
        {
          status: status,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // Backend is 2xx and JSON parsed successfully
    // CRITICAL: Forward Set-Cookie headers from backend to browser
    // This ensures HttpOnly cookies (vah_session, vah_role, vah_user) are set
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    // Forward all Set-Cookie headers from backend
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`[BFF auth/login] Forwarding ${setCookieHeaders.length} Set-Cookie headers to browser`);
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('Set-Cookie', cookie);
      });
    } else {
      // Also check for single Set-Cookie header (some backends use this)
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        console.log(`[BFF auth/login] Forwarding Set-Cookie header to browser`);
        responseHeaders.set('Set-Cookie', setCookie);
      } else {
        console.warn(`[BFF auth/login] No Set-Cookie headers from backend - cookies may not be set`);
      }
    }

    return NextResponse.json(json ?? { ok: true, data: {} }, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF auth/login] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }
    console.error(`[BFF auth/login] Exception in route ${routePath}:`, error);
    console.error(`[BFF auth/login] Backend URL was: ${backendUrl}`);
    console.error(`[BFF auth/login] Error stack:`, error?.stack);
    return NextResponse.json(
      { 
        ok: false, 
        error: { 
          code: 'BFF_EXCEPTION', 
          message: error?.message || 'Failed to login',
          route: routePath 
        }
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

