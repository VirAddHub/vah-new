import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';
import { requireBffAdmin } from '@/lib/server/requireBffAdmin';
import { csrfHeaderFromCookie } from '@/lib/server/backendMutationHeaders';

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Admin-only proxy for the operational self-test (security review F04/F10).
 * The browser never holds the self-test secret: when the API requires one, it is added here from the
 * server-only SELFTEST_SECRET variable.
 */
async function forward(req: NextRequest, path: string, method: "GET" | "POST") {
  const denied = await requireBffAdmin(req);
  if (denied) return denied;
  try {
    const cookie = req.headers.get('cookie') || '';
    const secret = (process.env.SELFTEST_SECRET || '').trim();
    const r = await fetch(`${getBackendOrigin()}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Cookie: cookie,
        ...(method === "POST" ? { "Content-Type": "application/json", ...csrfHeaderFromCookie(cookie) } : {}),
        ...(method === "POST" && secret ? { "x-selftest-secret": secret } : {}),
      },
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({ ok: false, error: "bad_upstream_response" }));
    return NextResponse.json(data, { status: r.status, headers: NO_STORE });
  } catch (error) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF Self-Test] server_misconfigured');
    } else {
      console.error('[BFF Self-Test] upstream_failed');
    }
    return NextResponse.json({ ok: false, error: "self_test_unavailable" }, { status: 502, headers: NO_STORE });
  }
}

export function GET(req: NextRequest) {
  return forward(req, "/api/ops/heartbeat", "GET");
}

export function POST(req: NextRequest) {
  return forward(req, "/api/ops/self-test", "POST");
}
