import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    const response = await fetch(`${backend}/api/account/businesses`, {
      method: 'GET',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const text = await response.text();
    let json: Record<string, unknown> | null = null;
    if (text.trim()) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // ignore
      }
    }
    if (!response.ok) {
      return NextResponse.json(json ?? { ok: false, error: 'BACKEND_ERROR' }, { status: response.status });
    }
    return NextResponse.json(json ?? { ok: true, data: [] });
  } catch (e: unknown) {
    if (isBackendOriginConfigError(e)) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured', details: (e as Error).message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: 'BFF_EXCEPTION' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const body = await request.json();
    const backend = getBackendOrigin();
    const csrfRes = await fetch(`${backend}/api/csrf`, { method: 'GET', headers: { Cookie: cookie }, cache: 'no-store' });
    let csrfToken: string | null = null;
    if (csrfRes.ok) {
      try {
        const d = await csrfRes.json() as { csrfToken?: string };
        csrfToken = d.csrfToken ?? null;
      } catch {
        // ignore
      }
    }
    const response = await fetch(`${backend}/api/account/businesses`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await response.text();
    let json: Record<string, unknown> | null = null;
    if (text.trim()) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // ignore
      }
    }
    return NextResponse.json(json ?? { ok: false, error: 'BACKEND_ERROR' }, { status: response.status });
  } catch (e: unknown) {
    if (isBackendOriginConfigError(e)) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured', details: (e as Error).message }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: 'BFF_EXCEPTION' }, { status: 500 });
  }
}
