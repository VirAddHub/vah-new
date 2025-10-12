import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiOrigin } from '@/lib/apiOrigin';

export async function POST(req: NextRequest) {
    console.log('[BFF] /forwarding/requests HIT');

    try {
        const body = await req.json();

        // Get cookies from the request
        const cookieStore = cookies();
        const cookieString = cookieStore.toString();

        // Use safe API origin that always ends with /api
        const backendUrl = `${apiOrigin()}/forwarding/requests`;

        console.log('[BFF Forwarding] Calling backend:', {
            url: backendUrl,
            body: body,
            hasCookies: !!cookieString
        });

        const res = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString,
                'Authorization': req.headers.get('authorization') || '',
            },
            body: JSON.stringify(body),
        }).catch((e) => {
            console.error('[BFF] fetch error', e);
            return new Response(JSON.stringify({ ok: false, code: 'bff_fetch_error' }), { status: 502 });
        });

        // If we got a low-level error above, res is already a Response.
        if (res instanceof Response) return res;

        const responseText = await (res as Response).text();
        console.log('[BFF] backend status', (res as Response).status, 'body:', responseText.slice(0, 500));

        return new NextResponse(responseText, {
            status: (res as Response).status,
            headers: {
                'Content-Type': 'application/json',
            }
        });

    } catch (error: any) {
        console.error('[BFF Forwarding] Error:', error);
        return NextResponse.json(
            { ok: false, error: 'bff_error', message: error.message },
            { status: 500 }
        );
    }
}
