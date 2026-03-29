import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";
import { requireBffAdmin } from "@/lib/server/requireBffAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json({ ok: false, error: "invalid_mail_item_id" }, { status: 400 });
  }

  try {
    const denied = await requireBffAdmin(req);
    if (denied) return denied;

    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/${encodeURIComponent(id)}/mark-destroyed`;

    let cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie") || "";
    let authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";

    const sessionCookie = req.cookies.get("vah_session");
    const roleCookie = req.cookies.get("vah_role");
    const userCookie = req.cookies.get("vah_user");

    if (!cookieHeader && (sessionCookie || roleCookie || userCookie)) {
      const parts: string[] = [];
      if (sessionCookie) parts.push(`vah_session=${sessionCookie.value}`);
      if (roleCookie) parts.push(`vah_role=${roleCookie.value}`);
      if (userCookie) parts.push(`vah_user=${encodeURIComponent(userCookie.value)}`);
      cookieHeader = parts.join("; ");
    }

    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (cookieHeader) headers["Cookie"] = cookieHeader;
    if (authHeader) headers["Authorization"] = authHeader;

    let csrfToken: string | null = null;
    if (cookieHeader) {
      const m = cookieHeader.match(/(?:^|;\s*)vah_csrf_token=([^;]+)/);
      if (m?.[1]) {
        try {
          csrfToken = decodeURIComponent(m[1].trim());
        } catch {
          csrfToken = m[1].trim();
        }
      }
    }
    if (!csrfToken) {
      try {
        const csrfRes = await fetch(`${backend}/api/csrf`, {
          method: "GET",
          headers: cookieHeader ? { Cookie: cookieHeader } : {},
          cache: "no-store",
        });
        if (csrfRes.ok) {
          const d = await csrfRes.json();
          csrfToken = d?.csrfToken ?? d?.token ?? null;
        }
      } catch {
        /* CSRF prefetch failed */
      }
    }
    if (csrfToken) {
      (headers as Record<string, string>)["X-CSRF-Token"] = csrfToken;
    }

    const r = await fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
    });

    const text = await r.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : { ok: r.ok };
    } catch {
      data = {
        ok: false,
        error: "invalid_response",
        message: text || r.statusText || "Unknown error",
        status: r.status,
      };
    }

    return NextResponse.json(data as object, {
      status: r.status,
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured", details: (error as Error).message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: false, error: "bff_proxy_failed" }, { status: 500 });
  }
}
