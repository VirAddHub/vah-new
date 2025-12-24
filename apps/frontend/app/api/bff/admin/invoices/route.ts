import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const url = new URL(`${backend}/api/admin/invoices`);
    const incoming = new URL(req.url);

    // forward supported filters + pagination
    for (const key of ["page", "page_size", "email", "user_id", "invoice_number", "from", "to"]) {
      const v = incoming.searchParams.get(key);
      if (v != null && v !== "") url.searchParams.set(key, v);
    }

    const r = await fetch(url.toString(), {
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
      console.error("[BFF Admin Invoices] Server misconfigured:", error.message);
      return NextResponse.json({ ok: false, error: "Server misconfigured", details: error.message }, { status: 500 });
    }
    console.error("[BFF Admin Invoices] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch admin invoices", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


