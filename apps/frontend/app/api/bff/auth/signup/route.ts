import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bff/auth/signup
 * Proxy signup to backend so Set-Cookie is set for the frontend origin.
 * Otherwise the next request (e.g. payments/redirect-flows) would get 401
 * because the session cookie was only for the backend domain.
 */
export async function POST(request: NextRequest) {
  const routePath = '/api/bff/auth/signup';
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/auth/signup`;

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[BFF auth/signup] Backend response: ${status} from ${backendUrl}`);
    }

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson =
      contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { ok: false, error: { code: 'BACKEND_NON_JSON', status, body: textPreview } },
          { status: 502 }
        );
      }
    }

    const responseHeaders = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    // Forward Set-Cookie so the browser gets the session for this origin (fixes 401 on next request)
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach((c) => responseHeaders.append('Set-Cookie', c));
    } else {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) responseHeaders.set('Set-Cookie', setCookie);
    }

    if (status < 200 || status >= 300) {
      // Return backend body as-is so frontend gets error.code (e.g. EMAIL_ALREADY_EXISTS)
      return NextResponse.json(json ?? { ok: false, error: textPreview }, { status, headers: responseHeaders });
    }

    return NextResponse.json(json ?? { ok: true, data: {} }, {
      status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF auth/signup] Exception:`, error?.message);
    return NextResponse.json(
      { ok: false, error: { code: 'BFF_EXCEPTION', message: error?.message || 'Failed to sign up' } },
      { status: 500 }
    );
  }
}
