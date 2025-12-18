import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    // Try to fetch whoami to verify auth state
    let whoamiStatus = null;
    let whoamiEmail = null;

    try {
      const whoamiRes = await fetch(`${backend}/api/auth/whoami`, {
        method: 'GET',
        headers: {
          'Cookie': cookie,
          'Content-Type': 'application/json',
        },
      });

      whoamiStatus = whoamiRes.status;

      if (whoamiRes.ok) {
        const whoamiData = await whoamiRes.json();
        whoamiEmail = whoamiData?.data?.user?.email || null;
      }
    } catch (whoamiError) {
      // Ignore whoami errors, just report status
      whoamiStatus = 'error';
    }

    return NextResponse.json({
      ok: true,
      node_env: process.env.NODE_ENV || 'unknown',
      backend_origin: backend,
      has_cookie: cookie.length > 0,
      whoami_status: whoamiStatus,
      whoami_email: whoamiEmail,
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF debug] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: BACKEND_API_ORIGIN is not set or invalid' },
        { status: 500 }
      );
    }
    console.error('[BFF debug] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to get debug info' },
      { status: 500 }
    );
  }
}
