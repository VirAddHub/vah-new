import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

// CSRF token names (matching backend middleware)
const CSRF_COOKIE_NAME = "vah_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Parse cookie header string into key-value object
 * Handles URL-encoded values and multiple cookies
 */
function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;

  const parts = header.split(";");
  for (const part of parts) {
    const [name, ...rest] = part.split("=");
    if (!name) continue;
    const key = name.trim();
    const value = rest.join("=").trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

/**
 * GET /api/bff/kyc/sumsub-token
 * Fetches a Sumsub access token for the WebSDK
 * Returns: { token: string }
 */
export async function GET(req: NextRequest) {
  const routePath = '/api/bff/kyc/sumsub-token';
  let backendUrl = '';

  try {
    // Get raw cookie header from browser request
    const rawCookieHeader = req.headers.get('cookie') || '';
    
    // Parse cookies to extract CSRF token
    const cookies = parseCookies(rawCookieHeader);
    const csrfToken = cookies[CSRF_COOKIE_NAME] || '';

    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/kyc/start`;

    // Build headers for backend request
    const headers = new Headers();
    headers.set('Cookie', rawCookieHeader);
    headers.set('Content-Type', 'application/json');

    // If CSRF token is missing, try to fetch it first
    let finalCsrfToken = csrfToken;
    if (!finalCsrfToken) {
      try {
        const csrfResponse = await fetch(`${backend}/api/auth/whoami`, {
          method: 'GET',
          headers: { 'Cookie': rawCookieHeader },
          cache: 'no-store',
        });
        // Extract CSRF token from Set-Cookie header in response
        const setCookieHeader = csrfResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          const csrfMatch = setCookieHeader.match(/vah_csrf_token=([^;]+)/);
          if (csrfMatch?.[1]) {
            finalCsrfToken = decodeURIComponent(csrfMatch[1]);
            // Update cookie header with CSRF token
            const updatedCookie = rawCookieHeader 
              ? `${rawCookieHeader}; vah_csrf_token=${finalCsrfToken}` 
              : `vah_csrf_token=${finalCsrfToken}`;
            headers.set('Cookie', updatedCookie);
          }
        }
      } catch (csrfError) {
        console.warn(`[${routePath}] Failed to fetch CSRF token, proceeding without it:`, csrfError);
      }
    }

    // Add CSRF token to header if we have it
    if (finalCsrfToken) {
      headers.set(CSRF_HEADER_NAME, finalCsrfToken);
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
