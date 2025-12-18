import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function POST(req: NextRequest) {
    try {
        const backend = getBackendOrigin();
        // Pass through raw body to backend
        const body = await req.text();
        const contentType = req.headers.get('content-type') || 'application/json';

        const backendUrl = `${backend}/api/quiz/submit`;

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
        if (isBackendOriginConfigError(error)) {
            console.error('[BFF quiz/submit] Server misconfigured:', error.message);
            return NextResponse.json(
                { ok: false, error: 'Server misconfigured', details: error.message },
                { status: 500 }
            );
        }
        console.error('[quiz-submit] Proxy error:', error);
        return NextResponse.json(
            { ok: false, error: "proxy_error", message: error.message },
            { status: 500 }
        );
    }
}

