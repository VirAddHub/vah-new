import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    const body = await request.json();

    const response = await fetch(`${backend}/api/payments/subscriptions`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data, { status: response.status });
    } else {
      return NextResponse.json(
        { ok: false, error: data.error || 'Failed to update subscription', details: data },
        { status: response.status }
      );
    }
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF subscription] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: BACKEND_API_ORIGIN is not set or invalid' },
        { status: 500 }
      );
    }
    console.error('[BFF subscription] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
