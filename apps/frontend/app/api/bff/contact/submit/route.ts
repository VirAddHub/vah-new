import { NextRequest, NextResponse } from "next/server";

const API = process.env.BACKEND_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
    if (!API) {
        return NextResponse.json(
            { ok: false, error: "Missing BACKEND_API_ORIGIN" },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();

        const res = await fetch(`${API}/api/contact`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: req.headers.get("cookie") || "",
            },
            credentials: "include",
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: data?.error || data?.message || "Request failed",
                },
                { status: res.status }
            );
        }

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json(
            {
                ok: false,
                error: error?.message || "Request failed",
            },
            { status: 500 }
        );
    }
}

