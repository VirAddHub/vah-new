import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/healthz`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ ok: true, data }, { status: 200 });
    } else {
      return NextResponse.json(
        { ok: false, error: data.error || 'Health check failed', details: data, status: response.status },
        { status: response.status }
      );
    }
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF healthz] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF healthz] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to check backend health' },
      { status: 500 }
    );
  }
}
