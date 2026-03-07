import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await context.params;
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    const csrfRes = await fetch(`${backend}/api/csrf`, { method: 'GET', headers: { Cookie: cookie }, cache: 'no-store' });
    let csrfToken: string | null = null;
    if (csrfRes.ok) {
      try {
        const d = await csrfRes.json();
        csrfToken = d.csrfToken ?? null;
      } catch {
        // ignore
      }
    }

    const response = await fetch(`${backend}/api/account/businesses/${businessId}/set-primary`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      cache: 'no-store',
    });
    const text = await response.text();
    const json = text.trim() ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
    return NextResponse.json(json ?? { ok: false, error: 'BACKEND_ERROR' }, { status: response.status });
  } catch (e: unknown) {
    if (isBackendOriginConfigError(e)) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured', details: (e as Error).message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: 'BFF_EXCEPTION' }, { status: 500 });
  }
}
