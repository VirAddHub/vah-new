import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bff/profile/certificate-url
 * Proxies to backend GET /api/profile/certificate-url.
 * Returns { url } when eligible (BFF translates to frontend path); 403 with error reason when not.
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    const response = await fetch(`${backend}/api/profile/certificate-url`, {
      method: 'GET',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await response.text();
    let json: Record<string, unknown> = {};
    if (text.trim().length > 0) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // pass
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, ...json, error: (json.error as string) || 'certificate_not_available' },
        { status: response.status }
      );
    }

    // When eligible, backend returns url: '/api/profile/certificate'; frontend uses BFF path
    const data = (json.data as { url?: string }) || {};
    const url = data.url === '/api/profile/certificate' ? '/api/bff/profile/certificate' : (data.url || '/api/bff/profile/certificate');
    return NextResponse.json(
      { ok: true, data: { url } },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: (error as Error).message },
        { status: 500 }
      );
    }
    console.error('[BFF profile/certificate-url] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to get certificate URL' },
      { status: 500 }
    );
  }
}
