import { NextRequest, NextResponse } from "next/server";
import { serialize } from "next-mdx-remote/serialize";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const source =
      typeof body?.source === "string" ? body.source : "";

    const serialized = await serialize(source);
    return NextResponse.json(serialized);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Serialize failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
