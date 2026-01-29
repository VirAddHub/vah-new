import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/bff/tags
 * Get list of all tags for current user
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/tags`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
      credentials: 'include',
      cache: 'no-store',
    });

    const raw = await response.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw: raw.substring(0, 300) };
    }

    if (response.ok) {
      return NextResponse.json(data, { status: response.status });
    } else {
      return NextResponse.json(
        { ok: false, error: data?.error || 'Failed to fetch tags', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF tags GET] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF tags GET] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
