import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendBase =
    process.env.BACKEND_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")?.concat("/api");

  if (!backendBase) {
    return NextResponse.json(
      {
        ok: false,
        error: "config_error",
        message: "BACKEND_API_ORIGIN is not configured",
      },
      { status: 500 }
    );
  }

  const formData = await req.formData();

  const res = await fetch(`${backendBase}/admin/blog/upload`, {
    method: "POST",
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
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
}

