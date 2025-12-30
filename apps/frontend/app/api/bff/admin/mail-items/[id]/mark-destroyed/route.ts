import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json({ ok: false, error: "invalid_mail_item_id" }, { status: 400 });
  }

  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/${encodeURIComponent(id)}/mark-destroyed`;

    // Parse cookies for CSRF token
    let cookieHeader = req.headers.get("cookie") || "";
    let csrfToken = "";
    const csrfMatch = cookieHeader.match(/(?:^|;\s*)vah_csrf_token=([^;]+)/);
    if (csrfMatch?.[1]) {
      try {
        csrfToken = decodeURIComponent(csrfMatch[1]);
      } catch {
        csrfToken = csrfMatch[1];
      }
    }

    // If CSRF token is missing, fetch it from whoami endpoint
    if (!csrfToken) {
      try {
        const whoamiResponse = await fetch(`${backend}/api/auth/whoami`, {
          method: 'GET',
          headers: { 'Cookie': cookieHeader },
          cache: 'no-store',
        });

        // Extract CSRF token from Set-Cookie header
        const setCookieHeader = whoamiResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          const newCsrfMatch = setCookieHeader.match(/vah_csrf_token=([^;]+)/);
          if (newCsrfMatch?.[1]) {
            try {
              csrfToken = decodeURIComponent(newCsrfMatch[1]);
            } catch {
              csrfToken = newCsrfMatch[1];
            }
            // Update cookie header with CSRF token
            cookieHeader = cookieHeader
              ? `${cookieHeader}; vah_csrf_token=${csrfToken}`
              : `vah_csrf_token=${csrfToken}`;
          }
        }
      } catch (csrfError) {
        console.warn('[BFF Admin Mail Item Mark Destroyed] Failed to fetch CSRF token:', csrfError);
      }
    }

    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...(req.headers.get("authorization") && { Authorization: req.headers.get("authorization")! }),
    };

    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    } else {
      console.error('[BFF Admin Mail Item Mark Destroyed] CSRF token still missing after attempt to fetch.');
      return NextResponse.json(
        { ok: false, error: 'csrf_token_missing', message: 'CSRF token is required for this request' },
        { status: 403 }
      );
    }

    const r = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      credentials: "include",
    });

    const data = await r.json().catch(() => ({ ok: false, error: r.statusText }));
    return NextResponse.json(data, {
      status: r.status,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error("[BFF Admin Mail Item Mark Destroyed] Server misconfigured:", error.message);
      return NextResponse.json({ ok: false, error: "Server misconfigured", details: error.message }, { status: 500 });
    }
    console.error("[BFF Admin Mail Item Mark Destroyed] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to mark mail item as destroyed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

