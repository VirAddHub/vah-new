import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * BFF endpoint for getting a specific forwarding request
 * Proxies to backend /api/forwarding/requests/:id with CSRF protection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const routePath = '/api/bff/forwarding/requests/[id]';
  let backendBase = '';

  try {
    const { id } = await params;
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendBase = backend;

    const response = await fetch(`${backend}/api/forwarding/requests/${id}`, {
      headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
    });

    const raw = await response.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'invalid_response', details: raw.substring(0, 300) },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || 'unknown_error', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      console.error(`[${routePath}] Server misconfigured:`, error);
      return NextResponse.json(
        { ok: false, error: 'server_misconfigured', details: String(error) },
        { status: 500 }
      );
    }

    console.error(`[${routePath}] error:`, error);
    return NextResponse.json(
      { ok: false, error: 'backend_connection_failed' },
      { status: 502 }
    );
  }
}

