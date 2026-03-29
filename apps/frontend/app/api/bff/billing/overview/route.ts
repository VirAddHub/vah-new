import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';
import { bffSafeLogError } from '@/lib/server/bffSafeLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const routePath = '/api/bff/billing/overview';
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/billing/overview`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    let json: any = null;
    const contentType = response.headers.get('content-type') || '';
    const looksLikeJson =
      contentType.includes('application/json') ||
      text.trim().startsWith('{') ||
      text.trim().startsWith('[');

    if (looksLikeJson && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        bffSafeLogError(routePath, 'backend_json_parse_failed', request, {
          upstreamStatus: status,
        });
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'BACKEND_NON_JSON',
              status,
              body: textPreview,
            },
          },
          { status: 502 }
        );
      }
    }

    if (status < 200 || status >= 300) {
      bffSafeLogError(routePath, 'backend_upstream_error', request, {
        upstreamStatus: status,
      });
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'BACKEND_ERROR',
            status,
            body: json ?? textPreview,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(json ?? { raw: textPreview }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      bffSafeLogError(routePath, 'misconfigured_backend_origin', request);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    bffSafeLogError(routePath, 'bff_exception', request);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'BFF_EXCEPTION',
          message: error?.message,
          route: routePath,
        },
      },
      { status: 500 }
    );
  }
}
