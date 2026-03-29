import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from './backendOrigin';
import { isBackendOriginConfigError } from './isBackendOriginError';

function isDbBackedAdmin(user: { is_admin?: unknown; role?: unknown } | undefined): boolean {
  if (!user || typeof user !== 'object') return false;
  const adminFlag = user.is_admin === true || user.is_admin === 1;
  const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
  return adminFlag || role === 'admin';
}

/**
 * BFF gate: confirm admin via backend `GET /api/auth/whoami` (same source as `useVerifiedAdminSession`).
 * Backend `requireAdmin` remains authoritative; this fails closed on the BFF if an upstream route is mis-wired.
 *
 * @returns `null` if the caller may proceed, otherwise a `NextResponse` to return from the handler.
 */
export async function requireBffAdmin(request: NextRequest): Promise<NextResponse | null> {
  try {
    const backend = getBackendOrigin();
    const cookie = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    const headers: HeadersInit = { Accept: 'application/json' };
    if (cookie) headers.Cookie = cookie;
    if (authHeader) headers.Authorization = authHeader;

    const whoamiRes = await fetch(`${backend}/api/auth/whoami`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const text = await whoamiRes.text();
    let json: Record<string, unknown>;
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = { ok: false, error: 'invalid_json' };
    }

    if (!whoamiRes.ok) {
      return NextResponse.json(json, { status: whoamiRes.status });
    }

    if (json.ok !== true) {
      return NextResponse.json(json, { status: whoamiRes.status });
    }

    const data = json.data;
    const user =
      data && typeof data === 'object' && data !== null && 'user' in data
        ? (data as { user?: unknown }).user
        : undefined;
    const u = user && typeof user === 'object' ? (user as { is_admin?: unknown; role?: unknown }) : undefined;

    if (!isDbBackedAdmin(u)) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    return null;
  } catch (e) {
    if (isBackendOriginConfigError(e)) {
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: 'admin_check_failed' }, { status: 500 });
  }
}
