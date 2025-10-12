import { NextRequest, NextResponse } from "next/server";

// Proxies the backend /api/metrics (Prometheus text) through BFF for cookie auth.
export async function GET(req: NextRequest) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
  if (!backend) return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_BACKEND_API_ORIGIN missing" }, { status: 500 });

  const url = `${backend.replace(/\/$/, "")}/metrics`;
  
  try {
    const r = await fetch(url, { 
      method: "GET", 
      headers: { 
        Accept: "text/plain",
        // Forward cookies for authentication
        Cookie: req.headers.get('cookie') || '',
        // Forward any auth headers from the original request
        ...(req.headers.get('authorization') && { 'Authorization': req.headers.get('authorization')! })
      }, 
      cache: "no-store" 
    });
    
    const text = await r.text();
    return new NextResponse(text, { 
      status: r.status, 
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      } 
    });
  } catch (error) {
    console.error('[BFF Metrics] Error fetching metrics:', error);
    return NextResponse.json({ 
      ok: false, 
      error: "Failed to fetch metrics",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
