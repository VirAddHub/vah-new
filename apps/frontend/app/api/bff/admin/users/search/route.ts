import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }

    const url = `${backend}/api/admin/users/search?q=` + encodeURIComponent(q);

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: req.headers.get("cookie") || "",
        ...(req.headers.get("authorization") && {
          Authorization: req.headers.get("authorization")!,
        }),
      },
      cache: "no-store",
      credentials: "include",
    });

    const payload = await upstream
      .json()
      .catch(() => ({ ok: false, error: "invalid_json" }));

    if (!upstream.ok || payload?.ok === false) {
      return NextResponse.json(payload, { status: upstream.status || 500 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF admin user search] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error("[BFF admin user search] error", error);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}


