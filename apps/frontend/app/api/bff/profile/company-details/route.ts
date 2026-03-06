import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/bff/profile/company-details
 * Update Companies House number and company name (proxies to backend).
 *
 * Status passthrough: we do NOT convert upstream status to 503. If the client
 * receives 503, it is from the backend. Backend returns 503 with error
 * "schema_not_ready" when the user table is missing the companies_house_number
 * column (run migration 122_add_companies_house_number.sql).
 */
export async function PATCH(request: NextRequest) {
  const routePath = '/api/bff/profile/company-details';
  let backendUrl = '';

  try {
    const cookie = request.headers.get('cookie') || '';
    const body = (await request.json()) as Record<string, unknown>;
    const backend = getBackendOrigin();
    backendUrl = `${backend}/api/profile/company-details`;

    console.log('[BFF profile/company-details] body', JSON.stringify(body));
    console.log('[BFF profile/company-details] upstream URL', backendUrl);
    console.log('[BFF profile/company-details] BACKEND_ORIGIN', backend ? '(set)' : '(missing)');

    const csrfResponse = await fetch(`${backend}/api/csrf`, {
      method: 'GET',
      headers: { Cookie: cookie },
      credentials: 'include',
      cache: 'no-store',
    });

    let csrfToken: string | null = null;
    if (csrfResponse.ok) {
      try {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken || null;
      } catch (e) {
        console.error('[BFF profile/company-details] Failed to parse CSRF response:', e);
      }
    }

    const payload = {
      company_number: body.company_number ?? body.companies_house_number,
      company_name: body.company_name,
      companies_house_number: body.companies_house_number ?? body.company_number,
    };

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const status = response.status;
    const text = await response.text();
    const textPreview = text.substring(0, 300);

    console.log('[BFF profile/company-details] upstream status', status, 'url', backendUrl);
    console.log('[BFF profile/company-details] upstream body', textPreview);

    let json: unknown = null;
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

    if (status < 200 || status >= 300) {
      const errBody = json as { ok?: boolean; error?: string; message?: string } | null;
      const responseBody = {
        ok: false,
        error: errBody?.error ?? 'backend_error',
        message: errBody?.message ?? textPreview,
        ...(errBody && typeof errBody === 'object' ? errBody : {}),
      };
      return NextResponse.json(responseBody, {
        status,
        headers: {
          'X-Upstream-Status': String(status),
          'X-Upstream-URL': backendUrl,
        },
      });
    }

    return NextResponse.json(json ?? { ok: true, data: {} }, { status: 200 });
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF profile/company-details] Server misconfigured:', (error as Error).message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: (error as Error).message },
        { status: 500 }
      );
    }
    console.error('[BFF profile/company-details] Exception:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'BFF_EXCEPTION',
        message: error instanceof Error ? error.message : 'Failed to update company details',
        route: routePath,
      },
      { status: 500 }
    );
  }
}
