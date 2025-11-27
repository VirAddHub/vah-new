import { NextResponse } from "next/server";

const DEFAULT_BACKEND =
  process.env.BACKEND_API_ORIGIN?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://vah-api-staging.onrender.com";

export async function GET() {
  try {
    const url = `${DEFAULT_BACKEND}/api/blog/posts`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    const contentType = res.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      console.error(
        "[bff/blog/list] Upstream returned non-JSON content-type:",
        contentType
      );
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_upstream_response",
          message: "Blog upstream did not return JSON",
          status: res.status,
        },
        { status: 502 }
      );
    }

    const json = await res.json();

    // Expecting `{ ok, data: [...] }` from backend (data is an array)
    if (!json || typeof json !== "object") {
      console.error("[bff/blog/list] Invalid JSON shape from upstream:", json);
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_upstream_shape",
          message: "Blog upstream returned unexpected JSON",
          status: res.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(json, { status: res.status });
  } catch (err) {
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
