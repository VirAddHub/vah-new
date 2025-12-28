import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bff/kyc/sumsub-token
 * Step 2: Diagnostic proxy - calls backend without CSRF to see exact error
 */
export async function GET(req: NextRequest) {
  const routePath = '/api/bff/kyc/sumsub-token';
  let backendUrl = '';

  try {
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/kyc/start`;
    const rawCookieHeader = req.headers.get("cookie") ?? "";

    // Log for debugging (remove in production)
    console.log(`[${routePath}] Calling backend: ${backendUrl}`);
    console.log(`[${routePath}] Cookies present: ${rawCookieHeader ? 'Yes' : 'No'}`);

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // forward login/session cookies (vah_session, etc.)
        cookie: rawCookieHeader,
      },
      cache: 'no-store',
    });

    const text = await backendRes.text();
    const textPreview = text.substring(0, 300);

    // Log backend response for debugging
    console.log(`[${routePath}] Backend response: ${backendRes.status} from ${backendUrl}`);
    console.log(`[${routePath}] Response preview: ${textPreview}`);

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: textPreview };
    }

    // Always return diagnostic format
    return NextResponse.json(
      {
        ok: backendRes.ok,
        status: backendRes.status,
        data,
        debug: {
          backendUrl,
          hasCookies: !!rawCookieHeader,
          cookieCount: rawCookieHeader.split(';').filter(c => c.trim()).length,
        },
      },
      { status: backendRes.status }
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

