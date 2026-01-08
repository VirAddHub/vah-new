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

  // Step 2: Check for authentication (cookies OR JWT token)
  // Backend accepts both, so we'll forward whatever is available
  const cookieHeader = req.headers.get("cookie") || "";
  const authHeader = req.headers.get("authorization") || "";
  
  // Try Next.js cookie API first
  const sessionCookie = req.cookies.get('vah_session');
  const roleCookie = req.cookies.get('vah_role');
  const userCookie = req.cookies.get('vah_user');

  // Check if we have either cookies OR JWT token
  const hasCookies = !!(sessionCookie || cookieHeader);
  const hasJWT = !!(authHeader && authHeader.startsWith('Bearer '));
  
  console.log("[BFF Admin Mail Item Mark Destroyed] Auth check", {
    hasCookies,
    hasJWT,
    hasSessionCookie: !!sessionCookie,
    hasRoleCookie: !!roleCookie,
    hasCookieHeader: !!cookieHeader,
    hasAuthHeader: !!authHeader,
    cookieHeaderLength: cookieHeader.length
  });

  // Step 3: Require at least one form of authentication
  if (!hasCookies && !hasJWT) {
    console.error("[BFF Admin Mail Item Mark Destroyed] No authentication found", { 
      hasCookies,
      hasJWT,
      cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 50) : 'empty'
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: "admin_authentication_required",
        message: "Authentication required. Please log in and try again."
      },
      { status: 403 }
    );
  }

  // If we have cookies, validate role (for cookie-based auth)
  // If we only have JWT, let backend validate (backend's requireAdmin middleware will check)
  if (hasCookies) {
    let role = (roleCookie?.value || 'user') as 'user' | 'admin';
    
    // Parse from cookie header if Next.js API didn't work
    if (!roleCookie && cookieHeader) {
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
          cookies[key] = decodeURIComponent(value);
        }
      });
      role = (cookies['vah_role'] || 'user') as 'user' | 'admin';
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
  }

  console.log("[BFF Admin Mail Item Mark Destroyed] Authentication found, forwarding to backend", {
    hasCookies,
    hasJWT
  });

  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/${encodeURIComponent(id)}/mark-destroyed`;

    // Step 4: Forward authentication to backend (cookies OR JWT token)
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

    // CRITICAL: Forward cookies if available
    if (cookieString) {
      headers["Cookie"] = cookieString;
      console.log("[BFF Admin Mail Item Mark Destroyed] Forwarding cookies to backend", {
        cookieLength: cookieString.length,
        hasSession: cookieString.includes('vah_session'),
        hasRole: cookieString.includes('vah_role')
      });
    }

    // CRITICAL: Forward Authorization header if available (JWT token)
    // Backend's requireAdmin middleware will validate the token and admin status
    if (authHeader) {
      headers["Authorization"] = authHeader;
      console.log("[BFF Admin Mail Item Mark Destroyed] Forwarding Authorization header to backend");
    }

    // At least one form of auth must be forwarded
    if (!cookieString && !authHeader) {
      console.error("[BFF Admin Mail Item Mark Destroyed] No authentication to forward", {
        hasCookieHeader: !!cookieHeader,
        hasSessionCookie: !!sessionCookie,
        hasAuthHeader: !!authHeader
      });
      return NextResponse.json(
        { 
          ok: false, 
          error: "authentication_missing",
          message: "No authentication found. Please log in and try again."
        },
        { status: 403 }
      );
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
