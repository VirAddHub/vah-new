import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/profile`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (error?.message?.includes('BACKEND_API_ORIGIN')) {
      console.error('[BFF profile] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: BACKEND_API_ORIGIN is not set' },
        { status: 500 }
      );
    }
    console.error('[BFF profile] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const body = await request.json();
    const backend = getBackendOrigin();

    const response = await fetch(`${backend}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Cookie': cookieHeader || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF profile PATCH] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: backend origin not configured' },
        { status: 500 }
      );
    }
    console.error('[BFF profile PATCH] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
