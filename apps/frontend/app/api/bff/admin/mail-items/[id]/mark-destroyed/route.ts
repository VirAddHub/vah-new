import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params?.id;

  console.log("[BFF Admin Mail Item Mark Destroyed] called", { id });

  // Step 1: Validate mail item ID
  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json(
      { ok: false, error: "invalid_mail_item_id" },
      { status: 400 }
    );
  }

  // Step 2: HARD REQUIRE admin authentication (MANDATORY - no fallbacks)
  // Read cookies directly from NextRequest (more reliable in API routes)
  const sessionCookie = req.cookies.get('vah_session');
  const roleCookie = req.cookies.get('vah_role');
  const userCookie = req.cookies.get('vah_user');

  const sessionToken = sessionCookie?.value || '';
  const role = (roleCookie?.value || 'user') as 'user' | 'admin';
  
  let user = null;
  if (userCookie?.value) {
    try {
      user = JSON.parse(userCookie.value);
    } catch {
      user = null;
    }
  }

  const isAuthenticated = Boolean(sessionToken && sessionToken.length > 10);

  console.log("[BFF Admin Mail Item Mark Destroyed] Session check", {
    hasSessionCookie: !!sessionCookie,
    hasRoleCookie: !!roleCookie,
    role,
    isAuthenticated,
    tokenLength: sessionToken.length
  });

  // Step 3: Validate admin authentication and role (MANDATORY - reject if not admin)
  if (!isAuthenticated || !sessionToken) {
    console.error("[BFF Admin Mail Item Mark Destroyed] No valid session token", { 
      isAuthenticated,
      tokenLength: sessionToken.length 
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: "admin_authentication_required",
        message: "Admin session not found. Please log in as an admin."
      },
      { status: 403 }
    );
  }

  if (role !== "admin") {
    console.error("[BFF Admin Mail Item Mark Destroyed] Non-admin attempted destruction", { 
      role,
      hasRoleCookie: !!roleCookie
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: "admin_authorization_required",
        message: "Admin role required. Only administrators can mark mail as destroyed."
      },
      { status: 403 }
    );
  }

  console.log("[BFF Admin Mail Item Mark Destroyed] Admin authenticated", {
    role,
    hasUser: !!user,
    userId: (user as any)?.id
  });

  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/${encodeURIComponent(id)}/mark-destroyed`;

    // Step 4: Extract and forward ALL cookies (preserve admin session)
    const cookie = req.headers.get("cookie") || "";
    const authHeader = req.headers.get("authorization");

    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // CRITICAL: Forward cookies to preserve admin identity
    if (cookie) {
      headers["Cookie"] = cookie;
    } else {
      // If no cookies, we cannot proceed (should not happen after validation above)
      console.error("[BFF Admin Mail Item Mark Destroyed] No cookies to forward");
      return NextResponse.json(
        { 
          ok: false, 
          error: "session_cookies_missing",
          message: "Session cookies not found. Please refresh and try again."
        },
        { status: 403 }
      );
    }

    // Forward Authorization header if present (for JWT/token auth)
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

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
