import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const id = ctx.params.id;
    const backend = getBackendOrigin();

    const resp = await fetch(
      `${backend}/api/billing/invoices/${encodeURIComponent(id)}/download`,
      {
        method: "GET",
        headers: {
          Cookie: cookieHeader || "",
        },
      }
    );

    const headers = new Headers(resp.headers);
    // Ensure the browser treats it as a download if backend didn't set it
    if (!headers.get("content-type")) headers.set("content-type", "application/pdf");

    return new NextResponse(resp.body, { status: resp.status, headers });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error("[BFF billing invoice download] Server misconfigured:", error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: backend origin not configured' },
        { status: 500 }
      );
    }
    console.error("[BFF billing invoice download] error:", error);
    return NextResponse.json({ ok: false, error: "Failed to download invoice" }, { status: 500 });
  }
}

