import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    const body = await request.json().catch(() => ({}));

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

    const response = await fetch(
      `${backend}/api/billing/payment-methods/complete-setup`,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(body ?? {}),
      }
    );

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
        error: data?.error ?? 'complete_setup_failed',
        message:
          data?.message ??
          'Failed to complete payment method update. Please try again.',
        ...data,
      },
      { status: response.status }
    );
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error(
        '[BFF complete-setup] Server misconfigured:',
        error.message
      );
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }

    console.error('[BFF complete-setup] error:', error);
    return NextResponse.json(
      { ok: false, error: 'complete_setup_failed' },
      { status: 500 }
    );
  }
}

