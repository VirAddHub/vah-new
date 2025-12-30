import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json({ ok: false, error: "invalid_mail_item_id" }, { status: 400 });
  }

  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/${encodeURIComponent(id)}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: req.headers.get("cookie") || "",
        ...(req.headers.get("authorization") && { Authorization: req.headers.get("authorization")! }),
      },
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
      console.error("[BFF Admin Mail Item] Server misconfigured:", error.message);
      return NextResponse.json({ ok: false, error: "Server misconfigured", details: error.message }, { status: 500 });
    }
    console.error("[BFF Admin Mail Item] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch admin mail item", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

