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

        const r = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "text/csv",
                Cookie: req.headers.get("cookie") ?? "",
                ...(req.headers.get("authorization") && {
                    Authorization: req.headers.get("authorization")!,
                }),
            },
            credentials: "include",
            cache: "no-store",
        });

        if (!r.ok) {
            // Try to parse as JSON error, fallback to text
            const errorText = await r.text().catch(() => r.statusText);
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
            return NextResponse.json(
                { ok: false, error: "server_misconfigured", details: error.message },
                { status: 500 }
            );
        }

        console.error("[BFF Admin Exports Destruction Log] fatal", error);
        return NextResponse.json(
            { ok: false, error: "bff_proxy_failed" },
            { status: 500 }
        );
    }
}

