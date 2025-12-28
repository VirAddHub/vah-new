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
  try {
    const backend = getBackendOrigin();
    const backendUrl = `${backend}/api/kyc/start`;

    // Forward cookies for authentication
    const cookieHeader = req.headers.get('cookie') || '';

    // If no cookies, return 401 (not authenticated)
    if (!cookieHeader) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_authenticated",
          message: "Authentication required. Please log in.",
        },
        { status: 401 },
      );
    }

    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      credentials: 'include',
      cache: 'no-store', // Never cache auth-related requests
    });

    const contentType = backendRes.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await backendRes.text().catch(() => "");
      console.error(
        "[bff/kyc/sumsub-token] Expected JSON but got:",
        text.slice(0, 200),
      );

      return NextResponse.json(
        {
          ok: false,
          error: "invalid_backend_response",
          message: "KYC service returned unexpected data.",
        },
        { status: 502 },
      );
    }

    let json: any;
    try {
      json = await backendRes.json();
    } catch (err) {
      console.error("[bff/kyc/sumsub-token] JSON parse error:", err);
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_json",
          message: "KYC service returned invalid JSON.",
        },
        { status: 502 },
      );
    }

    // If backend returned non-2xx, forward the error
    if (!backendRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json?.error || "backend_error",
          message: json?.message || `Backend returned ${backendRes.status}`,
        },
        { 
          status: backendRes.status,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        },
      );
    }

    // Extract token from response
    if (!json.ok || !json.token) {
      return NextResponse.json(
        {
          ok: false,
          error: json.error || "no_token",
          message: json.message || "Failed to get Sumsub access token.",
        },
        { 
          status: backendRes.status,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        },
      );
    }

    // Return just the token as expected by the WebSDK
    return NextResponse.json(
      { token: json.token }, 
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF kyc/sumsub-token] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error("[bff/kyc/sumsub-token] Network error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "backend_unreachable",
        message: "Unable to reach KYC service.",
      },
      { status: 502 },
    );
  }
}

