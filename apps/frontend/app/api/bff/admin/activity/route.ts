import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export async function GET(req: NextRequest) {
    try {
        const backend = getBackendOrigin();
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit') || '20';
        const offset = searchParams.get('offset') || '0';

        const url = `${backend}/api/admin/activity?limit=${limit}&offset=${offset}`;

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
            const errorData = await r.json().catch(() => ({ ok: false, items: [], error: r.statusText }));
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
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        });
    } catch (error: any) {
        if (isBackendOriginConfigError(error)) {
            console.error('[BFF Admin Activity] Server misconfigured:', error.message);
            return NextResponse.json(
                { ok: false, error: 'Server misconfigured', details: error.message },
                { status: 500 }
            );
        }
        console.error('[BFF Admin Activity] Error:', error);
        return NextResponse.json({
            ok: false,
            error: "Failed to fetch activity",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

