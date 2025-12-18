import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const backend = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;
    if (!backend) {
        return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_BACKEND_API_ORIGIN missing" }, { status: 500 });
    }

    const url = `${backend.replace(/\/$/, "")}/api/admin/billing/metrics`;

    try {
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
            const errorData = await r.json().catch(() => ({ ok: false, error: r.statusText }));
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
    } catch (error) {
        console.error('[BFF Admin Billing Metrics] Error:', error);
        return NextResponse.json({
            ok: false,
            error: "Failed to fetch billing metrics",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
