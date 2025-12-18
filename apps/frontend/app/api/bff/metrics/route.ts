import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Proxies the backend /api/metrics (Prometheus text) through BFF for cookie auth.
export async function GET(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/metrics`;
  
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
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF Metrics] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF Metrics] Error fetching metrics:', error);
    return NextResponse.json({ 
      ok: false, 
      error: "Failed to fetch metrics",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
