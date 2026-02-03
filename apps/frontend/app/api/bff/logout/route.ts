import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/bff/logout
 * Logout endpoint - clears auth cookies (vah_session and csrf cookie) using Set-Cookie with the SAME attributes as when set.
 * Returns { ok: true }.
 * 
 * This is an alias for /api/bff/auth/logout for consistency.
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/logout';
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
    console.log(`[BFF logout] Backend response: ${status} from ${backendUrl}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF logout] JSON parse failed for ${status} response:`, parseError);
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
    // Backend now clears both vah_session and vah_csrf_token with matching attributes
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      console.log(`[BFF logout] Forwarding ${setCookieHeaders.length} Set-Cookie headers to browser`);
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('Set-Cookie', cookie);
      });
    } else {
      // Also check for single Set-Cookie header
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        console.log(`[BFF logout] Forwarding Set-Cookie header to browser`);
        responseHeaders.set('Set-Cookie', setCookie);
      }
    }

    // Force clear known auth cookies to ensure clean state (safety net if backend headers fail)
    // Use SAME attributes as when cookies are set to ensure they clear properly
    const isSecure = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
    const baseClearOptions = 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0';
    const secureFlag = isSecure ? '; Secure' : '';
    const sameSiteValue = isSecure ? 'None' : 'Lax';
    
    // Clear vah_session with matching attributes (httpOnly, secure, sameSite: 'none')
    responseHeaders.append('Set-Cookie', `vah_session=; ${baseClearOptions}; HttpOnly; SameSite=${sameSiteValue}${secureFlag}`);
    
    // Clear CSRF token with matching attributes (not httpOnly, secure based on env, sameSite based on env)
    responseHeaders.append('Set-Cookie', `vah_csrf_token=; ${baseClearOptions}; SameSite=${sameSiteValue}${secureFlag}`);
    
    // Clear any legacy cookies that might exist
    responseHeaders.append('Set-Cookie', `vah_role=; ${baseClearOptions}; HttpOnly; SameSite=${sameSiteValue}${secureFlag}`);
    responseHeaders.append('Set-Cookie', `vah_user=; ${baseClearOptions}; HttpOnly; SameSite=${sameSiteValue}${secureFlag}`);
    responseHeaders.append('Set-Cookie', `vah_jwt=; ${baseClearOptions}; SameSite=${sameSiteValue}${secureFlag}`);

    // Always return success for logout (even if backend fails, we want to clear client-side state)
    return NextResponse.json(json ?? { ok: true }, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF logout] Server misconfigured:`, error.message);
      return NextResponse.json(
        {
          ok: false,
          error: 'Server misconfigured',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.error(`[BFF logout] Unexpected error:`, error);
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
