import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

// CSRF token names (confirmed from backend middleware)
const CSRF_COOKIE_NAME = "vah_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Parse cookie header string into key-value object
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
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/kyc/start`;
    
    // Get raw cookie header from browser
    const rawCookieHeader = req.headers.get("cookie") ?? "";
    const cookies = parseCookies(rawCookieHeader);
    let csrfToken = cookies[CSRF_COOKIE_NAME] || '';
    let finalCookieHeader = rawCookieHeader;

    // If CSRF token is missing, fetch it from whoami endpoint
    if (!csrfToken) {
      try {
        const csrfResponse = await fetch(`${backend}/api/auth/whoami`, {
          method: 'GET',
          headers: { 'Cookie': rawCookieHeader },
          cache: 'no-store',
        });
        
        // Extract CSRF token from Set-Cookie header
        const setCookieHeader = csrfResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          const csrfMatch = setCookieHeader.match(/vah_csrf_token=([^;]+)/);
          if (csrfMatch?.[1]) {
            csrfToken = decodeURIComponent(csrfMatch[1]);
            // Update cookie header with CSRF token
            finalCookieHeader = rawCookieHeader 
              ? `${rawCookieHeader}; vah_csrf_token=${csrfToken}` 
              : `vah_csrf_token=${csrfToken}`;
          }
        }
      } catch (csrfError) {
        console.warn(`[${routePath}] Failed to fetch CSRF token:`, csrfError);
      }
    }

    // Build headers for backend request
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      cookie: finalCookieHeader,
    };

    // Add CSRF token to header (required by backend)
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }

    console.log(`[${routePath}] Calling backend: ${backendUrl}`);
    console.log(`[${routePath}] CSRF token present: ${!!csrfToken}`);
    console.log(`[${routePath}] Cookies present: ${!!finalCookieHeader}`);

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers,
      cache: 'no-store',
    });

    const text = await backendRes.text();
    const textPreview = text.substring(0, 300);

    console.log(`[${routePath}] Backend response: ${backendRes.status} from ${backendUrl}`);
    console.log(`[${routePath}] Response preview: ${textPreview}`);

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: textPreview };
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: backendRes.status,
          error: data?.error || data?.message || 'BACKEND_ERROR',
          data,
          debug: {
            backendUrl,
            hasCookies: !!finalCookieHeader,
            hasCsrfToken: !!csrfToken,
            cookieCount: finalCookieHeader.split(';').filter(c => c.trim()).length,
          },
        },
        { status: backendRes.status }
      );
    }

    const token = data?.token;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          status: 500,
          error: "NO_TOKEN",
          message: "No token returned from backend /api/kyc/start",
          details: data,
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
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        {
          ok: false,
          status: 500,
          error: 'SERVER_MISCONFIGURED',
          message: error.message,
          debug: { backendUrl },
        },
        { status: 500 }
      );
    }
    console.error(`[${routePath}] Exception:`, error);
    console.error(`[${routePath}] Backend URL was: ${backendUrl}`);
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        error: "Unexpected error calling backend /api/kyc/start",
        message: error?.message ?? String(error),
        debug: { backendUrl, route: routePath },
      },
      { status: 500 }
    );
  }
}
