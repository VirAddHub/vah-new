import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/bff/tags/delete
 * Delete a tag from all active mail items
 */
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const csrfToken = request.headers.get('x-csrf-token') || '';
    const backend = getBackendOrigin();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'invalid_json' },
        { status: 400 }
      );
    }

    const { tag } = body;

    if (!tag) {
      return NextResponse.json(
        { ok: false, error: 'Tag is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${backend}/api/tags/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ tag }),
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
        { ok: false, error: data?.error || 'Failed to delete tag', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF tags delete POST] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF tags delete POST] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
