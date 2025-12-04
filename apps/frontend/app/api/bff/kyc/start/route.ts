import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND = 'https://vah-api-staging.onrender.com/api';

export async function POST(req: NextRequest) {
  const backendBase =
    process.env.BACKEND_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')?.concat('/api') ||
    DEFAULT_BACKEND;

  const backendUrl = `${backendBase}/kyc/start`;

  try {
    // Forward cookies for authentication
    const cookieHeader = req.headers.get('cookie') || '';

    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      credentials: 'include',
    });

    const contentType = backendRes.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await backendRes.text().catch(() => "");
      console.error(
        "[bff/kyc/start] Expected JSON but got:",
        text.slice(0, 200),
      );

      return NextResponse.json(
        {
          ok: false,
          error: "invalid_backend_response",
          message: "KYC service returned unexpected data.",
        },
        { status: 502 },
      );
    }

    let json: any;
    try {
      json = await backendRes.json();
    } catch (err) {
      console.error("[bff/kyc/start] JSON parse error:", err);
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_json",
          message: "KYC service returned invalid JSON.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(json, { status: backendRes.status });
  } catch (error) {
    console.error("[bff/kyc/start] Network error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "backend_unreachable",
        message: "Unable to reach KYC service.",
      },
      { status: 502 },
    );
  }
}

