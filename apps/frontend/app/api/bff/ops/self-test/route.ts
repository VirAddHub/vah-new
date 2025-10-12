import { NextRequest, NextResponse } from "next/server";

// Proxies self-test endpoints through BFF for cookie auth
export async function GET(req: NextRequest) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
  if (!backend) return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_BACKEND_API_ORIGIN missing" }, { status: 500 });

  const url = `${backend.replace(/\/$/, "")}/ops/heartbeat`;
  
  try {
    const r = await fetch(url, { 
      method: "GET", 
      headers: { 
        Accept: "application/json",
        // Forward any auth headers from the original request
        ...(req.headers.get('authorization') && { 'Authorization': req.headers.get('authorization')! })
      }, 
      cache: "no-store" 
    });
    
    const data = await r.json();
    return NextResponse.json(data, { 
      status: r.status,
      headers: { 
        "Cache-Control": "no-cache, no-store, must-revalidate"
      } 
    });
  } catch (error) {
    console.error('[BFF Self-Test] Error fetching heartbeat:', error);
    return NextResponse.json({ 
      ok: false, 
      error: "Failed to fetch heartbeat",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
  if (!backend) return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_BACKEND_API_ORIGIN missing" }, { status: 500 });

  const url = `${backend.replace(/\/$/, "")}/ops/self-test`;
  
  try {
    const r = await fetch(url, { 
      method: "POST", 
      headers: { 
        Accept: "application/json",
        "Content-Type": "application/json",
        // Forward any auth headers from the original request
        ...(req.headers.get('authorization') && { 'Authorization': req.headers.get('authorization')! }),
        // Forward the self-test secret header
        ...(req.headers.get('x-selftest-secret') && { 'x-selftest-secret': req.headers.get('x-selftest-secret')! })
      }, 
      cache: "no-store" 
    });
    
    const data = await r.json();
    return NextResponse.json(data, { 
      status: r.status,
      headers: { 
        "Cache-Control": "no-cache, no-store, must-revalidate"
      } 
    });
  } catch (error) {
    console.error('[BFF Self-Test] Error running self-test:', error);
    return NextResponse.json({ 
      ok: false, 
      error: "Failed to run self-test",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
