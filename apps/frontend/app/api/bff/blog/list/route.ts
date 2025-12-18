import { NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET() {
  try {
    const backend = getBackendOrigin();
    const upstreamUrl = `${backend}/api/blog/posts`;

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      const text = await upstream.text().catch(() => "");
      console.error(
        "[bff/blog/list] Upstream did not return JSON. Status:",
        upstream.status,
        "Content-Type:",
        contentType,
        "Body snippet:",
        text.slice(0, 200)
      );

      return NextResponse.json(
        {
          ok: false,
          error: "invalid_upstream_response",
          message: "Blog upstream did not return JSON",
          status: upstream.status,
        },
        { status: 502 }
      );
    }

    const json = await upstream.json();

    if (!json || typeof json !== "object") {
      console.error("[bff/blog/list] Unexpected JSON shape from upstream:", json);
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_upstream_shape",
          message: "Blog upstream returned unexpected JSON",
          status: upstream.status,
        },
        { status: 502 }
      );
    }

    // Pass through exactly what backend sends: { ok, data: [...] }
    return NextResponse.json(json, { status: upstream.status });
  } catch (err: any) {
    if (isBackendOriginConfigError(err)) {
      console.error('[BFF blog/list] Server misconfigured:', err.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: err.message },
        { status: 500 }
      );
    }
    console.error("[bff/blog/list] Error fetching posts:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "bff_error",
        message: "Failed to fetch blog posts",
      },
      { status: 500 }
    );
  }
}
