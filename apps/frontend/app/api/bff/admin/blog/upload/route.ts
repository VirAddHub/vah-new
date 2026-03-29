import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';
import { buildBackendMutationHeaders } from '@/lib/server/backendMutationHeaders';
import { requireBffAdmin } from '@/lib/server/requireBffAdmin';

export async function POST(req: NextRequest) {
  try {
    const denied = await requireBffAdmin(req);
    if (denied) return denied;

    const backend = getBackendOrigin();
    const cookie = req.headers.get("cookie") || "";
    const formData = await req.formData();

    const headers = await buildBackendMutationHeaders(backend, cookie);

    const res = await fetch(`${backend}/api/admin/blog/upload`, {
    method: "POST",
    headers,
    body: formData as any,
  });

  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_not_json",
        message: text.slice(0, 1000),
      },
      { status: res.status }
    );
  }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF admin/blog/upload] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error('[BFF admin/blog/upload] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload blog post' },
      { status: 500 }
    );
  }
}

