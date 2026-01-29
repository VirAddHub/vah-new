import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/bff/tags/merge
 * Atomically merge one tag into another across all mail items
 */
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();

    // Fetch CSRF token
    const csrfResponse = await fetch(`${backend}/api/csrf`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
      credentials: 'include',
      cache: 'no-store',
    });

    let csrfToken: string | null = null;
    if (csrfResponse.ok) {
      try {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken || null;
      } catch (e) {
        console.error('[BFF tags merge] Failed to parse CSRF token response:', e);
      }
    }

    const response = await fetch(`${backend}/api/tags/merge`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(body),
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
        { ok: false, error: data?.error || 'Failed to merge tags', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF tags merge] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF tags merge] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to merge tags' },
      { status: 500 }
    );
  }
}
