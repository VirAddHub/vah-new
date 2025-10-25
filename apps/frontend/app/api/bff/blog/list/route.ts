import { NextResponse } from "next/server";

const ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

export async function GET() {
  const r = await fetch(`${ORIGIN}/api/blog/posts`, { cache: "no-store" });
  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}
