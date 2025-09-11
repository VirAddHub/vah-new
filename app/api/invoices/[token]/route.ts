import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND = process.env.BACKEND_API_ORIGIN!; // e.g. https://api.virtualaddresshub.co.uk/api

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
    const url = `${BACKEND}/invoices/${encodeURIComponent(params.token)}`;

    const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'manual', // preserve backend status codes (410, etc.)
        headers: {
            'X-Forwarded-Host': req.headers.get('host') ?? ''
        }
    });

    const headers = new Headers(res.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('Pragma', 'no-cache');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Robots-Tag', 'noindex, nofollow');

    return new NextResponse(res.body, { status: res.status, headers });
}
