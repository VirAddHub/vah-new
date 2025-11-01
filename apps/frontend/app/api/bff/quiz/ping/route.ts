import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        // Lightweight analytics ping - no-op for now, place to hook product analytics later
        // You can add Google Analytics, Plausible, Mixpanel, etc. here

        // Optional: Log to console in development
        if (process.env.NODE_ENV === 'development') {
            const body = await req.json().catch(() => ({}));
            console.log('[quiz-ping] Quiz completed:', body);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[quiz-ping] Error:', error);
        return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
    }
}

