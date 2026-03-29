import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

async function backendGet(request: NextRequest, path: string) {
  const cookie = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const backend = getBackendOrigin();
  const url = `${backend}${path}`;
  const headers: HeadersInit = {
    Cookie: cookie,
    'Content-Type': 'application/json',
  };
  if (authHeader) headers.Authorization = authHeader;

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });
  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  if (text.trim().length > 0) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* non-JSON */
    }
  }
  return { response, json, text, url };
}

/**
 * GET /api/bff/dashboard/bootstrap
 * Single round-trip proxy: whoami + profile + compliance + billing overview (session-sensitive, never cached).
 */
export async function GET(request: NextRequest) {
  const debug = process.env.NEXT_PUBLIC_DASHBOARD_BOOTSTRAP_DEBUG === '1';

  try {
    const [who, prof, comp, bill] = await Promise.all([
      backendGet(request, '/api/auth/whoami'),
      backendGet(request, '/api/profile'),
      backendGet(request, '/api/profile/compliance'),
      backendGet(request, '/api/billing/overview'),
    ]);

    if (debug) {
      console.info('[BFF dashboard/bootstrap]', {
        t: Date.now(),
        whoami: who.response.status,
        profile: prof.response.status,
        compliance: comp.response.status,
        billing: bill.response.status,
      });
    }

    if (
      !who.response.ok ||
      who.response.status === 401 ||
      !who.json ||
      who.json.ok !== true
    ) {
      return NextResponse.json(
        { ok: false, error: 'unauthenticated', status: who.response.status },
        { status: 401, headers: NO_STORE }
      );
    }

    if (!prof.response.ok || !prof.json || prof.json.ok !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: 'profile_fetch_failed',
          status: prof.response.status,
          details: prof.json ?? prof.text.substring(0, 200),
        },
        { status: 502, headers: NO_STORE }
      );
    }

    if (!comp.response.ok || !comp.json || comp.json.ok !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: 'compliance_fetch_failed',
          status: comp.response.status,
          details: comp.json ?? comp.text.substring(0, 200),
        },
        { status: 502, headers: NO_STORE }
      );
    }

    const whoamiData = (who.json?.data as Record<string, unknown> | undefined) ?? null;
    const profileData = prof.json.data;
    const complianceData = comp.json.data;
    const billingOk =
      bill.response.ok && bill.json !== null && bill.json.ok === true;
    const billingData = billingOk && bill.json ? bill.json.data : null;

    if (debug && !billingOk) {
      console.warn('[BFF dashboard/bootstrap] billing non-OK; returning partial billingOverview=null', {
        status: bill.response.status,
      });
    }

    const fetchedAt = new Date().toISOString();

    return NextResponse.json(
      {
        ok: true,
        data: {
          whoami: whoamiData,
          profile: profileData,
          compliance: complianceData,
          billingOverview: billingData,
          fetchedAt,
          ...(debug
            ? {
                _debug: {
                  t: Date.now(),
                  sources: {
                    whoami: who.url,
                    profile: prof.url,
                    compliance: comp.url,
                    billing: bill.url,
                  },
                  verificationStateFrom: 'GET /api/profile/compliance (bundled)',
                  planFrom: 'GET /api/billing/overview (bundled)',
                },
              }
            : {}),
        },
      },
      { status: 200, headers: NO_STORE }
    );
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: (error as Error).message },
        { status: 500, headers: NO_STORE }
      );
    }
    console.error('[BFF dashboard/bootstrap] error:', error);
    return NextResponse.json(
      { ok: false, error: 'bootstrap_failed', message: (error as Error)?.message },
      { status: 500, headers: NO_STORE }
    );
  }
}
