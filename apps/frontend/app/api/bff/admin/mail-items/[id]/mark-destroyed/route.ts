import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log("[BFF Admin Mail Item Mark Destroyed] called", { id });

  // Step 1: Validate mail item ID
  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json(
      { ok: false, error: "invalid_mail_item_id" },
      { status: 400 }
    );
  }

  // Step 2: Extract authentication headers to forward to backend
  // Backend's requireAdmin middleware will validate admin status
  // We don't validate here - just forward everything and let backend handle it
  
  // Read headers case-insensitively (some clients send lowercase headers)
  const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie") || "";
  let authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  
  // Try Next.js cookie API to rebuild cookie string if needed
  const sessionCookie = req.cookies.get('vah_session');
  const roleCookie = req.cookies.get('vah_role');
  const userCookie = req.cookies.get('vah_user');

  // Log all headers for debugging (but don't log sensitive values)
  const allHeaders = Object.fromEntries(req.headers.entries());
  const headerKeys = Object.keys(allHeaders);
  
  console.log("[BFF Admin Mail Item Mark Destroyed] Request received", {
    hasCookieHeader: !!cookieHeader,
    hasAuthHeader: !!authHeader,
    hasSessionCookie: !!sessionCookie,
    cookieHeaderLength: cookieHeader.length,
    authHeaderLength: authHeader.length,
    headerKeys: headerKeys.filter(k => k.toLowerCase().includes('auth') || k.toLowerCase().includes('cookie')),
    allHeaderKeys: headerKeys
  });

  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/${encodeURIComponent(id)}/mark-destroyed`;

    // Step 3: Forward authentication to backend (cookies AND/OR JWT token)
    // Use the cookie header we already read (or rebuild from req.cookies if needed)
    let cookieString = cookieHeader;
    
    // If we don't have a cookie header but have individual cookies, rebuild it
    if (!cookieString && (sessionCookie || roleCookie || userCookie)) {
      const cookieParts: string[] = [];
      if (sessionCookie) cookieParts.push(`vah_session=${sessionCookie.value}`);
      if (roleCookie) cookieParts.push(`vah_role=${roleCookie.value}`);
      if (userCookie) cookieParts.push(`vah_user=${encodeURIComponent(userCookie.value)}`);
      cookieString = cookieParts.join('; ');
    }

    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // Forward cookies if available
    if (cookieString) {
      headers["Cookie"] = cookieString;
    }

    // Forward Authorization header if available (JWT token)
    // Backend's requireAdmin middleware will validate admin status
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Log what we're forwarding
    console.log("[BFF Admin Mail Item Mark Destroyed] Forwarding to backend", {
      hasCookies: !!cookieString,
      hasAuth: !!authHeader,
      cookieLength: cookieString?.length || 0,
      authHeaderLength: authHeader?.length || 0
    });

    const r = await fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
    });

    // Handle response - try to parse as JSON, fallback to error object
    let data;
    const text = await r.text();
    try {
      data = text ? JSON.parse(text) : { ok: r.ok };
    } catch (parseError) {
      // If JSON parsing fails, return error object with the raw text
      console.error("[BFF Admin Mail Item Mark Destroyed] Failed to parse response", {
        status: r.status,
        text: text.substring(0, 200), // Log first 200 chars
        error: parseError
      });
      data = {
        ok: false,
        error: "invalid_response",
        message: text || r.statusText || "Unknown error",
        status: r.status
      };
    }
    
    // Log backend response for debugging (especially errors)
    if (!r.ok || !data.ok) {
      console.error("[BFF Admin Mail Item Mark Destroyed] Backend returned error", {
        status: r.status,
        backendResponse: data,
        responseText: text.substring(0, 500) // Log first 500 chars
      });
    }

    return NextResponse.json(data, {
      status: r.status,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured", details: error.message },
        { status: 500 }
      );
    }

    console.error("[BFF Admin Mail Item Mark Destroyed] fatal", error);
    return NextResponse.json(
      { ok: false, error: "bff_proxy_failed" },
      { status: 500 }
    );
  }
}
