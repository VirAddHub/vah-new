import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/test-excel-write`;

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
        const csrfResponse = await fetch(`${backend}/api/auth/whoami`, {
          method: 'GET',
          headers: { 'Cookie': cookieHeader },
          cache: 'no-store',
        });

        const setCookieHeader = csrfResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          const newCsrfMatch = setCookieHeader.match(/vah_csrf_token=([^;]+)/);
          if (newCsrfMatch?.[1]) {
            csrfToken = decodeURIComponent(newCsrfMatch[1]);
            cookieHeader = cookieHeader
              ? `${cookieHeader}; vah_csrf_token=${csrfToken}`
              : `vah_csrf_token=${csrfToken}`;
          }
        }
      } catch (csrfError) {
        console.warn('[BFF Admin Mail Items Test Excel Write] Failed to fetch CSRF token:', csrfError);
      }
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    };

    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }

    if (req.headers.get("authorization")) {
      headers["Authorization"] = req.headers.get("authorization")!;
    }

    const r = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      credentials: "include",
    });

    const data = await r.json().catch(() => ({ ok: false, error: r.statusText }));

    const responseHeaders = new Headers();
    const backendSetCookie = r.headers.get('set-cookie');
    if (backendSetCookie) {
      responseHeaders.set('Set-Cookie', backendSetCookie);
    }
    responseHeaders.set('Content-Type', 'application/json');

    return NextResponse.json(data, {
      status: r.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error("[BFF Admin Mail Items Test Excel Write] Server misconfigured:", error.message);
      return NextResponse.json({ ok: false, error: "Server misconfigured", details: error.message }, { status: 500 });
    }
    console.error("[BFF Admin Mail Items Test Excel Write] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to test Excel write", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

