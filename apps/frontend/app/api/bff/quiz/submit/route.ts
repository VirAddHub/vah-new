import { NextRequest, NextResponse } from "next/server";

const API = process.env.BACKEND_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

export async function POST(req: NextRequest) {
    if (!API) {
        return NextResponse.json(
            { ok: false, error: "Missing BACKEND_API_ORIGIN" },
            { status: 500 }
        );
    }

    try {
        // Pass through raw body to backend
        const body = await req.text();
        const contentType = req.headers.get('content-type') || 'application/json';

        const backendUrl = `${API}/api/quiz/submit`;

        const res = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "content-type": contentType,
                // Forward any custom headers if needed
                ...(req.headers.get('x-webhook-secret') && {
                    'x-webhook-secret': req.headers.get('x-webhook-secret') || '',
                }),
            },
            body,
            // Include credentials if backend checks auth cookies
            credentials: "include",
        });

        const data = await res.text();

        return new NextResponse(data, {
            status: res.status,
            headers: {
                "content-type": res.headers.get("content-type") || "application/json",
            },
        });
    } catch (error: any) {
        console.error('[quiz-submit] Proxy error:', error);
        return NextResponse.json(
            { ok: false, error: "proxy_error", message: error.message },
            { status: 500 }
        );
    }
}

