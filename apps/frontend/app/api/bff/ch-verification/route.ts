import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND = 'https://vah-api-staging.onrender.com/api';

export async function GET(req: NextRequest) {
  const backendBase =
    process.env.BACKEND_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')?.concat('/api') ||
    DEFAULT_BACKEND;

  const backendUrl = `${backendBase}/profile/ch-verification`;

  let backendRes: Response;
  try {
    // Forward cookies for authentication
    const cookieHeader = req.headers.get('cookie') || '';
    backendRes = await fetch(backendUrl, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        cookie: cookieHeader,
      },
      credentials: "include",
    });
  } catch (error) {
    console.error("[bff/ch-verification] Network error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "backend_unreachable",
        message: "Unable to reach verification service.",
      },
      { status: 502 },
    );
  }

  const contentType = backendRes.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await backendRes.text().catch(() => "");
    console.error(
      "[bff/ch-verification] Expected JSON but got:",
      text.slice(0, 200),
    );

    return NextResponse.json(
      {
        ok: false,
        error: "invalid_backend_response",
        message: "Verification service returned unexpected data.",
      },
      { status: 502 },
    );
  }

  let json: any;
  try {
    json = await backendRes.json();
  } catch (err) {
    console.error("[bff/ch-verification] JSON parse error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
        message: "Verification service returned invalid JSON.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json(json, { status: backendRes.status });
}

export async function POST(req: NextRequest) {
  const backendBase =
    process.env.BACKEND_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')?.concat('/api') ||
    DEFAULT_BACKEND;

  const backendUrl = `${backendBase}/profile/ch-verification`;

  try {
    // Get the form data from the request
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "missing_file", message: "No file provided" },
        { status: 400 },
      );
    }

    // Create a new FormData for the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    // Forward cookies for authentication
    const cookieHeader = req.headers.get('cookie') || '';

    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      body: backendFormData,
      headers: {
        cookie: cookieHeader,
      },
      credentials: "include",
    });

    const contentType = backendRes.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await backendRes.text().catch(() => "");
      console.error(
        "[bff/ch-verification POST] Expected JSON but got:",
        text.slice(0, 200),
      );

      return NextResponse.json(
        {
          ok: false,
          error: "invalid_backend_response",
          message: "Verification service returned unexpected data.",
        },
        { status: 502 },
      );
    }

    let json: any;
    try {
      json = await backendRes.json();
    } catch (err) {
      console.error("[bff/ch-verification POST] JSON parse error:", err);
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_json",
          message: "Verification service returned invalid JSON.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(json, { status: backendRes.status });
  } catch (error) {
    console.error("[bff/ch-verification POST] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

