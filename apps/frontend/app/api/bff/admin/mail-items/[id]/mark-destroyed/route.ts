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
    const cookieHeader = req.headers.get("cookie") || "";
    let csrfToken = "";
    const csrfMatch = cookieHeader.match(/(?:^|;\s*)vah_csrf_token=([^;]+)/);
    if (csrfMatch?.[1]) {
      try {
        csrfToken = decodeURIComponent(csrfMatch[1]);
      } catch {
        csrfToken = csrfMatch[1];
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

