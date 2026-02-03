import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/bff/auth/logout
 * Proxy logout request to backend
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/auth/logout';
  let backendUrl = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/auth/logout`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.log(`[BFF auth/logout] Backend response: ${status} from ${backendUrl}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF auth/logout] JSON parse failed for ${status} response:`, parseError);
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

    // Build response headers - forward Set-Cookie headers to clear cookies
    const responseHeaders = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    // Forward all Set-Cookie headers from backend (to clear HttpOnly cookies)
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`[BFF auth/logout] Forwarding ${setCookieHeaders.length} Set-Cookie headers to browser`);
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('Set-Cookie', cookie);
      });
    } else {
      // Also check for single Set-Cookie header
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        console.log(`[BFF auth/logout] Forwarding Set-Cookie header to browser`);
        responseHeaders.set('Set-Cookie', setCookie);
      }
    }

    // Always return success for logout (even if backend fails, we want to clear client-side state)
    return NextResponse.json(json ?? { ok: true, message: 'Logged out successfully' }, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF auth/logout] Server misconfigured:`, error.message);
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Server misconfigured', 
          details: error.message 
        }, 
        { status: 500 }
      );
    }

    console.error(`[BFF auth/logout] Unexpected error:`, error);
    return NextResponse.json(
      { 
        ok: false, 
        error: 'internal_error',
        message: "An error occurred during logout" 
      }, 
      { status: 500 }
    );
  }
}
