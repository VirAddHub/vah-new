import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    // Helper to fetch and get preview
    const fetchWithPreview = async (url: string) => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Cookie': cookie,
            'Content-Type': 'application/json',
          },
        });

        const raw = await res.text();
        let bodyPreview = raw.substring(0, 300);
        let parsed: any = null;

        try {
          parsed = JSON.parse(raw);
          bodyPreview = JSON.stringify(parsed).substring(0, 300);
        } catch {
          // Keep raw preview if not JSON
        }

        return {
          status: res.status,
          ok: res.ok,
          bodyPreview,
        };
      } catch (err) {
        return {
          status: 'error',
          ok: false,
          bodyPreview: err instanceof Error ? err.message.substring(0, 300) : 'Unknown error',
        };
      }
    };

    // Fetch whoami and profile
    const [whoami, profile] = await Promise.all([
      fetchWithPreview(`${backend}/api/auth/whoami`),
      fetchWithPreview(`${backend}/api/profile`),
    ]);

    // Extract email from whoami if available
    let whoamiEmail = null;
    if (whoami.ok && whoami.bodyPreview) {
      try {
        const parsed = JSON.parse(whoami.bodyPreview + (whoami.bodyPreview.length < 300 ? '' : '...'));
        whoamiEmail = parsed?.data?.user?.email || null;
      } catch {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      ok: true,
      node_env: process.env.NODE_ENV || 'unknown',
      backend_origin: backend,
      has_cookie: cookie.length > 0,
      whoami: {
        status: whoami.status,
        ok: whoami.ok,
        bodyPreview: whoami.bodyPreview,
        email: whoamiEmail,
      },
      profile: {
        status: profile.status,
        ok: profile.ok,
        bodyPreview: profile.bodyPreview,
      },
    });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF debug] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: BACKEND_API_ORIGIN is not set or invalid', details: error.message },
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
