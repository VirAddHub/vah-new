import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND = "https://vah-api-staging.onrender.com";

function resolveBackendBase() {
  const origin =
    process.env.BACKEND_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND;
  return origin.replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "missing_user_id", message: "userId is required" },
      { status: 400 },
    );
  }

  const backendUrl = `${resolveBackendBase()}/api/admin/ch-verification/proof/${encodeURIComponent(userId)}`;

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
    console.error("[bff/admin/ch-verification/proof] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: "Unable to fetch proof" },
      { status: 500 },
    );
  }
}

