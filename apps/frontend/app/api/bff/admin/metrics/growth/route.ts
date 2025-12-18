import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const { search } = new URL(req.url);
    const backendUrl = `${backend}/api/admin/metrics/growth${search}`;
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
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF Growth Metrics] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF Growth Metrics] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
