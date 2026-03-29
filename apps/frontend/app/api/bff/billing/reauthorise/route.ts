import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';
import { bffSafeLogError } from '@/lib/server/bffSafeLog';

const ROUTE = '/api/bff/billing/reauthorise';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    let csrfToken: string | null = null;
    const csrfResponse = await fetch(`${backend}/api/csrf`, {
      method: 'GET',
      headers: { Cookie: cookie },
      credentials: 'include',
      cache: 'no-store',
    });
    if (csrfResponse.ok) {
      try {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken || null;
      } catch {
        // ignore
      }
    }

    const response = await fetch(`${backend}/api/billing/reauthorise`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    });

    // Read response as text first
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
        { ok: false, error: data?.error || 'Failed to create reauthorization link', status: response.status, details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      bffSafeLogError(ROUTE, 'misconfigured_backend_origin', request);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    bffSafeLogError(ROUTE, 'bff_exception', request);
    return NextResponse.json(
      { ok: false, error: 'Failed to create reauthorization link' },
      { status: 500 }
    );
  }
}
