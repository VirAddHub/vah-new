import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bff/business-owners/verify/start
 * Proxies to backend POST /api/business-owners/verify/start.
 * Body: { token: string }. Returns { ok, data: { started, sumsubToken, applicantId, owner? } }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const backend = getBackendOrigin();
    const response = await fetch(`${backend}/api/business-owners/verify/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await response.text();
    let json: Record<string, unknown> = {};
    if (text.trim().length > 0) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // pass
      }
    }

    return NextResponse.json(
      json?.ok !== undefined ? json : { ok: false, data: { started: false }, ...json },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: (error as Error).message },
        { status: 500 }
      );
    }
    console.error('[BFF business-owners/verify/start] error:', error);
    return NextResponse.json(
      { ok: false, error: 'server_error', data: { started: false, message: 'Error starting verification' } },
      { status: 500 }
    );
  }
}
