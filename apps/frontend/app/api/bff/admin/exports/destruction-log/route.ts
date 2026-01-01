import { NextRequest, NextResponse } from "next/server";
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const backend = getBackendOrigin();
        const { searchParams } = new URL(req.url);

        // Forward query params (from, to) if present
        const queryString = searchParams.toString();
        const url = `${backend}/api/admin/exports/destruction-log${queryString ? `?${queryString}` : ''}`;

        console.log('[BFF Admin Exports] Fetching from:', url);
        console.log('[BFF Admin Exports] Has cookies:', !!req.headers.get('cookie'));

        const r = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "text/csv",
                Cookie: req.headers.get('cookie') || '',
                ...(req.headers.get('authorization') && { 'Authorization': req.headers.get('authorization')! })
            },
            cache: "no-store",
            credentials: "include"
        });

        console.log('[BFF Admin Exports] Backend response status:', r.status);

        if (!r.ok) {
            // Try to parse as JSON error, fallback to text
            const errorText = await r.text().catch(() => r.statusText);
            console.error('[BFF Admin Exports] Backend error:', r.status, errorText);
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { ok: false, error: errorText, status: r.status };
            }
            return NextResponse.json(errorData, {
                status: r.status,
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            });
        }

        // Stream CSV response
        const csvText = await r.text();
        const filename = r.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'destruction-log.csv';

        return new NextResponse(csvText, {
            status: r.status,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        });
    } catch (error: any) {
        if (isBackendOriginConfigError(error)) {
            console.error('[BFF Admin Exports Destruction Log] Server misconfigured:', error.message);
            return NextResponse.json(
                { ok: false, error: 'Server misconfigured', details: error.message },
                { status: 500 }
            );
        }
        console.error('[BFF Admin Exports Destruction Log] Error:', error);
        console.error('[BFF Admin Exports Destruction Log] Error stack:', error instanceof Error ? error.stack : 'No stack');
        return NextResponse.json({
            ok: false,
            error: "Failed to export destruction log",
            details: error instanceof Error ? error.message : 'Unknown error',
            type: error?.constructor?.name || typeof error
        }, { status: 500 });
    }
}

