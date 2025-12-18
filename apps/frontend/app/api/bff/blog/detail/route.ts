import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(req: NextRequest) {
  try {
    const backend = getBackendOrigin();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "missing_slug", message: "Slug is required" },
        { status: 400 },
      );
    }

    const backendUrl = `${backend}/api/blog/posts/${encodeURIComponent(slug)}`;

  let backendRes: Response;
  try {
    backendRes = await fetch(backendUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
  } catch (error) {
    console.error("[bff/blog/detail] Network error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "backend_unreachable",
        message: "Unable to reach blog service.",
      },
      { status: 502 },
    );
  }

  const contentType = backendRes.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await backendRes.text().catch(() => "");
    console.error(
      "[bff/blog/detail] Upstream did not return JSON. Status:",
      backendRes.status,
      "Content-Type:",
      contentType,
      "Body snippet:",
      text.slice(0, 200)
    );

    return NextResponse.json(
      {
        ok: false,
        error: "invalid_backend_response",
        message: "Blog service returned unexpected data.",
        status: backendRes.status,
      },
      { status: 502 },
    );
  }

  let json: any;
  try {
    json = await backendRes.json();
  } catch (err) {
    const text = await backendRes.text().catch(() => "");
    const snippet = text.slice(0, 200);
    console.error(
      "[bff/blog/detail] JSON parse error. Status:",
      backendRes.status,
      "Body snippet:",
      snippet
    );
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
        message: "Blog service returned invalid JSON.",
        status: backendRes.status,
      },
      { status: 502 },
    );
  }

    return NextResponse.json(json, { status: backendRes.status });
  } catch (error: any) {
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF blog/detail] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    throw error; // Re-throw network/parse errors to existing handlers
  }
}
