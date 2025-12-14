import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const id = ctx.params.id;

    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/billing/invoices/${encodeURIComponent(id)}/download`,
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
  } catch (error) {
    console.error("[BFF billing invoice download] error:", error);
    return NextResponse.json({ ok: false, error: "Failed to download invoice" }, { status: 500 });
  }
}

