import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/server/backendOrigin";
import { isBackendOriginConfigError } from "@/lib/server/isBackendOriginError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined" || id === "null" || id.trim() === "") {
    return NextResponse.json({ ok: false, error: "invalid_invoice_id" }, { status: 400 });
  }

  try {
    const cookie = request.headers.get("cookie") || "";
    const authHeader = request.headers.get("authorization") || "";
    const backend = getBackendOrigin();

    const incoming = new URL(request.url);
    const disposition = incoming.searchParams.get("disposition");

    const backendUrl = new URL(`${backend}/api/admin/invoices/${encodeURIComponent(id)}/download`);
    if (disposition) backendUrl.searchParams.set("disposition", disposition);

    const headers: Record<string, string> = {};
    if (cookie) headers["Cookie"] = cookie;
    if (authHeader) headers["Authorization"] = authHeader;

    const resp = await fetch(backendUrl.toString(), { method: "GET", headers });

    if (resp.ok) {
      const headers = new Headers(resp.headers);
      if (!headers.get("content-type")) headers.set("content-type", "application/pdf");
      return new NextResponse(resp.body, { status: resp.status, headers });
    }

    const errorText = await resp.text();
    let errorData: any;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || "Failed to download invoice" };
    }

    return NextResponse.json(
      { ok: false, error: errorData.error || "Failed to download invoice", details: errorData },
      { status: resp.status }
    );
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error("[BFF Admin Invoice Download] Server misconfigured:", error.message);
      return NextResponse.json({ ok: false, error: "Server misconfigured", details: error.message }, { status: 500 });
    }
    console.error("[BFF Admin Invoice Download] Error:", error);
    return NextResponse.json({ ok: false, error: "Failed to download invoice" }, { status: 500 });
  }
}


