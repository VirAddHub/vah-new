import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Proxies self-test endpoints through BFF for cookie auth
export async function GET(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/ops/heartbeat`;

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
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF Self-Test] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF Self-Test] Error fetching heartbeat:', error);
    return NextResponse.json({
      ok: false,
      error: "Failed to fetch heartbeat",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const url = `${backend}/api/ops/self-test`;

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
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF Self-Test] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF Self-Test] Error running self-test:', error);
    return NextResponse.json({
      ok: false,
      error: "Failed to run self-test",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
