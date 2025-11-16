import { NextRequest, NextResponse } from "next/server";

const ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }
    
    const r = await fetch(`${ORIGIN}/api/blog/posts/${encodeURIComponent(slug)}`, { 
      cache: "no-store",
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // Check if response is JSON
    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await r.text();
      console.error(`[BFF Blog Detail] Expected JSON but got ${contentType}. Response:`, text.substring(0, 200));
      return NextResponse.json(
        { ok: false, error: "Invalid response format", details: text.substring(0, 100) },
        { status: 502 }
      );
    }
    
    const j = await r.json();
    return NextResponse.json(j, { status: r.status });
  } catch (error) {
    console.error('[BFF Blog Detail] Error:', error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch blog post", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
