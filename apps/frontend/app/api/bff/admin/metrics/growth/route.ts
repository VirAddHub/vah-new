import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log('[BFF Growth Metrics] Handler started...');
  
  try {
    // For Render deployment, the backend URL should be something like:
    // https://your-backend-service.onrender.com
    const ORIGIN = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
    console.log('[BFF Growth Metrics] Backend origin:', ORIGIN);
    
    if (!ORIGIN) {
      console.error('[BFF Growth Metrics] NEXT_PUBLIC_BACKEND_API_ORIGIN is not set');
      // Return mock data for testing when backend is not configured
      return NextResponse.json({
        ok: true,
        data: {
          window_days: 60,
          kpis: {
            active_paying: 0,
            scan_sla_24h_pct: 0,
            stale_mail_over_14d: 0,
          },
          series: {
            daily_signups: [],
            daily_mail_received: [],
            daily_forwarding_requests: [],
          }
        }
      });
    }

    const { search } = new URL(req.url);
    const backendUrl = `${ORIGIN}/api/admin/metrics/growth${search}`;
    console.log('[BFF Growth Metrics] Fetching from:', backendUrl);
    
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        // Forward cookies for authentication
        Cookie: req.headers.get('cookie') || '',
        // Forward any auth headers from the original request
        ...(req.headers.get('authorization') && { 'Authorization': req.headers.get('authorization')! })
      },
      credentials: "include",
      cache: "no-store",
    });
    
    console.log('[BFF Growth Metrics] Backend response status:', res.status);
    
    if (!res.ok) {
      console.error('[BFF Growth Metrics] Backend returned error:', res.status, res.statusText);
      return NextResponse.json({ 
        ok: false, 
        error: `Backend error: ${res.status} ${res.statusText}` 
      }, { status: res.status });
    }
    
    const json = await res.json();
    console.log('[BFF Growth Metrics] Backend response data:', json);
    
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error('[BFF Growth Metrics] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
