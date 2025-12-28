import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { ok: true, source: "sumsub-basic" },
    { status: 200 }
  );
}
