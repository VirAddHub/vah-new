import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_ORIGIN = "https://vah-api-staging.onrender.com";

function resolveBackendOrigin() {
  const envOrigin =
    process.env.BACKEND_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND_ORIGIN;
  return envOrigin.replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url") || url.searchParams.get("path");

  if (!target) {
    return NextResponse.json(
      { ok: false, error: "missing_path", message: "path or url is required" },
      { status: 400 },
    );
  }

  const backendOrigin = resolveBackendOrigin();
  const backendUrl = target.startsWith("http")
    ? target
    : `${backendOrigin}${target.startsWith("/") ? target : `/${target}`}`;

  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const backendRes = await fetch(backendUrl, {
      headers: {
        cookie: cookieHeader,
      },
      credentials: "include",
    });

    if (!backendRes.ok) {
      const text = await backendRes.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "proxy_error",
          status: backendRes.status,
          message: text || "Failed to fetch proof",
        },
        { status: backendRes.status },
      );
    }

    const headers = new Headers();
    ["content-type", "content-length", "content-disposition"].forEach((key) => {
      const value = backendRes.headers.get(key);
      if (value) headers.set(key, value);
    });

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers,
    });
  } catch (error) {
    console.error("[bff/ch-verification/proof] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: "Unable to fetch proof" },
      { status: 500 },
    );
  }
}

