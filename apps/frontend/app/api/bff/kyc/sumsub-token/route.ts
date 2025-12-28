import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

// CSRF token names (confirmed from backend middleware and forwarding routes)
const CSRF_COOKIE_NAME = "vah_csrf_token";  // From apps/backend/src/middleware/csrf.ts
const CSRF_HEADER_NAME = "x-csrf-token";     // From forwarding routes and CSRF middleware

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
  try {
    const backend = getBackendOrigin();
    
    // Cookies from the browser (session + csrf)
    const rawCookieHeader = req.headers.get("cookie") ?? "";
    const cookies = parseCookies(rawCookieHeader);
    const csrfToken = cookies[CSRF_COOKIE_NAME] ?? "";

    // If CSRF token is missing, try to fetch it first
    let finalCsrfToken = csrfToken;
    let finalCookieHeader = rawCookieHeader;
    
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
            finalCookieHeader = rawCookieHeader 
              ? `${rawCookieHeader}; vah_csrf_token=${finalCsrfToken}` 
              : `vah_csrf_token=${finalCsrfToken}`;
          }
        }
      } catch (csrfError) {
        console.warn(`[BFF kyc/sumsub-token] Failed to fetch CSRF token:`, csrfError);
      }
    }

    // Build headers for backend request
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      cookie: finalCookieHeader,
    };

    // Add CSRF token to header if we have it
    if (finalCsrfToken) {
      headers[CSRF_HEADER_NAME] = finalCsrfToken;
    }

    const backendRes = await fetch(`${backend}/api/kyc/start`, {
      method: "POST",
      headers,
      cache: 'no-store',
    });

    const text = await backendRes.text();

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ??
            data?.message ??
            "Failed to start KYC with backend",
          status: backendRes.status,
          details: data,
        },
        { status: backendRes.status }
      );
    }

    const token = data?.token;

    if (!token) {
      return NextResponse.json(
        {
          error: "No token returned from backend /api/kyc/start",
          details: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ token }, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { error: 'SERVER_MISCONFIGURED', message: error.message },
        { status: 500 }
      );
    }
    console.error("[bff] /kyc/sumsub-token error", error);
    return NextResponse.json(
      {
        error: "Unexpected error calling backend /api/kyc/start",
        message: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
