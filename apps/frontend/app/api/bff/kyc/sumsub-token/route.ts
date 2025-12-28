import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/bff/kyc/sumsub-token
 * Fetches a Sumsub access token for the WebSDK
 * Returns: { token: string }
 */
export async function GET(req: NextRequest) {
  const routePath = '/api/bff/kyc/sumsub-token';
  let backendUrl = '';

  try {
    const cookie = req.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/kyc/start`;

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
          cache: 'no-store',
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

    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers,
      cache: 'no-store', // Never cache backend requests
    });

    const status = backendRes.status;
    const text = await backendRes.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.error(`[BFF kyc/sumsub-token] Backend response: ${status} from ${backendUrl}, body preview: ${textPreview}`);

    // Attempt JSON parse only if content looks like JSON
    let json: any = null;
    const contentType = backendRes.headers.get('content-type') || '';
    const looksLikeJson = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error(`[BFF kyc/sumsub-token] JSON parse failed for ${status} response:`, parseError);
        return NextResponse.json(
          {
            error: 'BACKEND_NON_JSON',
            status,
            details: {
              code: 'BACKEND_NON_JSON',
              body: textPreview
            }
          },
          { status: 502 }
        );
      }
    }

    // If backend status is not 2xx, return backend error with full details
    if (status < 200 || status >= 300) {
      return NextResponse.json(
        {
          error: json?.error || json?.message || 'BACKEND_ERROR',
          status,
          details: json || { raw: textPreview }
        },
        { status: status } // Forward the backend status code
      );
    }

    // Backend is 2xx - extract token
    const token = json?.token;

    if (!token) {
      return NextResponse.json(
        {
          error: 'NO_TOKEN',
          status: 500,
          details: {
            message: 'No token returned from backend /api/kyc/start',
            backendResponse: json || { raw: textPreview }
          }
        },
        { status: 500 }
      );
    }

    // Return just the token as expected by the WebSDK
    return NextResponse.json(
      { token },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error(`[BFF kyc/sumsub-token] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        {
          error: 'SERVER_MISCONFIGURED',
          status: 500,
          details: { message: error.message }
        },
        { status: 500 }
      );
    }
    console.error(`[BFF kyc/sumsub-token] Exception in route ${routePath}:`, error);
    console.error(`[BFF kyc/sumsub-token] Backend URL was: ${backendUrl}`);
    console.error(`[BFF kyc/sumsub-token] Error stack:`, error?.stack);
    return NextResponse.json(
      {
        error: 'BFF_EXCEPTION',
        status: 500,
        details: {
          message: error?.message,
          route: routePath
        }
      },
      { status: 500 }
    );
  }
}
