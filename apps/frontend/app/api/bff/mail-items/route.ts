import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/bff/mail-items
 * Proxy mail-items requests to backend
 * Supports query params: ?page=1&pageSize=20&includeArchived=true
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const backend = getBackendOrigin();

    // Forward query params to backend
    const backendUrl = `${backend}/api/mail-items?${searchParams.toString()}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward cookies (primary auth method)
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    // Also forward Authorization header if present (for backward compatibility)
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF mail-items] Server misconfigured:', error.message);
      return NextResponse.json(
        { error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF mail-items] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

