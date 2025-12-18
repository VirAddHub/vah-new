import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(req: NextRequest) {
    try {
        const backend = getBackendOrigin();
        const url = `${backend}/api/admin/health/summary`;

        const r = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Cookie: req.headers.get('cookie') || '',
                ...(req.headers.get('authorization') && { 'Authorization': req.headers.get('authorization')! })
            },
            cache: "no-store",
            credentials: "include"
        });

        if (!r.ok) {
            const errorData = await r.json().catch(() => ({ ok: false, severity: 'down', error: r.statusText }));
            return NextResponse.json(errorData, {
                status: r.status,
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            });
        }

        const data = await r.json();
        return NextResponse.json(data, {
            status: r.status,
            headers: {
                "Cache-Control": "public, max-age=60" // Cache for 60 seconds
            }
        });
    } catch (error: any) {
        if (isBackendOriginConfigError(error)) {
            console.error('[BFF Admin Health Summary] Server misconfigured:', error.message);
            return NextResponse.json(
                { ok: false, error: 'Server misconfigured', details: error.message },
                { status: 500 }
            );
        }
        console.error('[BFF Admin Health Summary] Error:', error);
        return NextResponse.json({
            ok: false,
            severity: 'down',
            error: "Failed to fetch health summary"
        }, { status: 500 });
    }
}

