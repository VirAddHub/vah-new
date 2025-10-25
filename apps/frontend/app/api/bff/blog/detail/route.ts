import { NextRequest, NextResponse } from "next/server";

const ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ ok:false, error:"missing_slug" }, { status: 400 });
  const r = await fetch(`${ORIGIN}/api/blog/posts/${encodeURIComponent(slug)}`, { cache: "no-store" });
  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}
