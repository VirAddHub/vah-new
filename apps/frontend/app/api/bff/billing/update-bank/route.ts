import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/billing/update-bank`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader || '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF update-bank] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: backend origin not configured' },
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
