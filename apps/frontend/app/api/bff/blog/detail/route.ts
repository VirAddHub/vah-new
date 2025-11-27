import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND = 'https://vah-api-staging.onrender.com/api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "missing_slug", message: "Slug is required" },
      { status: 400 },
    );
  }

  const backendBase =
    process.env.BACKEND_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')?.concat('/api') ||
    DEFAULT_BACKEND;

  const backendUrl = `${backendBase}/blog/posts/${encodeURIComponent(slug)}`;

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
}
