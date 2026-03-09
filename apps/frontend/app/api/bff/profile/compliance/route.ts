import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bff/profile/compliance
 * Proxies to backend GET /api/profile/compliance.
 * Returns identity compliance flags for the current user (cookies forwarded).
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    const response = await fetch(`${backend}/api/profile/compliance`, {
      method: 'GET',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await response.text();
    let json: unknown = null;
    if (text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        // pass
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        typeof json === 'object' && json !== null && 'error' in (json as object)
          ? (json as { ok?: boolean; error?: string; [k: string]: unknown })
          : { ok: false, error: 'compliance_fetch_failed', status: response.status },
        { status: response.status }
      );
    }

    return NextResponse.json(json ?? { ok: true, data: null }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: (error as Error).message },
        { status: 500 }
      );
    }
    console.error('[BFF profile/compliance] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch compliance' },
      { status: 500 }
    );
  }
}
