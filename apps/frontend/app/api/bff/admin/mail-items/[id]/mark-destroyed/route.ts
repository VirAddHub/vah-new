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

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json(
      { ok: false, error: "invalid_mail_item_id" },
      { status: 400 }
    );
  }

  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/admin/mail-items/${encodeURIComponent(id)}/mark-destroyed`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") ?? "",
        ...(req.headers.get("authorization") && {
          Authorization: req.headers.get("authorization")!,
        }),
      },
      credentials: "include",
      cache: "no-store",
    });

    const text = await r.text();
    const data = text ? JSON.parse(text) : { ok: r.ok };

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
