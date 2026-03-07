import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    // Backend requires X-CSRF-Token for state-changing requests when session cookie is present
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

    const response = await fetch(`${backend}/api/billing/update-bank`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
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
    }
    return NextResponse.json(
      {
        ok: false,
        error: data?.error ?? 'update_bank_failed',
        message: data?.message ?? (data?.error === 'csrf_token_missing' || data?.error === 'csrf_token_invalid'
          ? 'Session security check failed. Please refresh the page and try again.'
          : 'Failed to create update bank link'),
        ...data,
      },
      { status: response.status }
    );
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF update-bank] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF update-bank] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create update bank link' },
      { status: 500 }
    );
  }
}
