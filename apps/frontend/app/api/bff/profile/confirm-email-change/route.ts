import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

const INVALID = { ok: true, data: { changed: false, message: 'This confirmation link is invalid or has expired.' } };
const NO_STORE = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

/**
 * GET /api/bff/profile/confirm-email-change
 * Confirms an email change using the token from the verification email (public, no session needed).
 *
 * The token is a bearer capability, so it is never written to logs, and upstream error bodies are
 * never passed back to the browser (security review F09, F17). Logs carry only status codes.
 */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json(
      { ok: true, data: { changed: false, message: 'This confirmation link is invalid.' } },
      { status: 200, headers: NO_STORE }
    );
  }

  try {
    const response = await fetch(
      `${getBackendOrigin()}/api/profile/confirm-email-change?token=${encodeURIComponent(token)}`,
      { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' }
    );

    if (!response.ok) {
      console.error('[BFF confirm-email-change] upstream_status', response.status);
      return NextResponse.json({ ok: false, error: { code: 'BACKEND_ERROR', status: response.status } }, { status: 502, headers: NO_STORE });
    }

    const json = await response.json().catch(() => null);
    if (!json) {
      console.error('[BFF confirm-email-change] upstream_non_json', response.status);
      return NextResponse.json({ ok: false, error: { code: 'BACKEND_NON_JSON', status: response.status } }, { status: 502, headers: NO_STORE });
    }
    // Always 200 with ok:true from here (no account enumeration).
    return NextResponse.json(json, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error(
      '[BFF confirm-email-change]',
      isBackendOriginConfigError(error) ? 'server_misconfigured' : 'request_failed'
    );
    return NextResponse.json(INVALID, { status: 200, headers: NO_STORE });
  }
}
