import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.BACKEND_API_ORIGIN;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mailItemId = searchParams.get('mailItemId');
    const disposition = searchParams.get('disposition') || 'inline';

    if (!mailItemId) return new Response('mailItemId required', { status: 400 });

    if (!API_BASE) return new Response('API base not configured', { status: 500 });

    // Always call backend BFF streamer
    const upstream = await fetch(
        `${API_BASE}/bff/mail/scan-url?mailItemId=${encodeURIComponent(mailItemId)}&disposition=${encodeURIComponent(disposition)}`,
        {
            headers: { cookie: req.headers.get('cookie') || '' },
            redirect: 'manual',
            cache: 'no-store',
        }
    );

    const ct = upstream.headers.get('content-type') || '';
    const isPdf = ct.toLowerCase().includes('application/pdf');
    if (upstream.status === 200 && isPdf && upstream.body) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Cache-Control', 'private, max-age=0, no-store');
        headers.set('Content-Disposition', `${disposition}; filename="document-${mailItemId}.pdf"`);
        return new Response(upstream.body, { status: 200, headers });
    }

    let url: string | null = null;
    try {
        const j = await upstream.json();
        url = j?.url || null;
    } catch { }

    if (url) {
        const fileRes = await fetch(url, { cache: 'no-store' });
        if (!fileRes.ok || !fileRes.body) return new Response('Failed to fetch file', { status: 502 });
        const headers = new Headers();
        headers.set('Content-Type', fileRes.headers.get('content-type') || 'application/pdf');
        headers.set('Cache-Control', 'private, max-age=0, no-store');
        headers.set('Content-Disposition', `${disposition}; filename="document-${mailItemId}.pdf"`);
        return new Response(fileRes.body, { status: 200, headers });
    }

    const text = await upstream.text().catch(() => '');
    return new Response(text || 'Upstream error', { status: upstream.status || 500 });
}

function sanitizeFilename(name: string) {
    return name.replace(/[^\p{L}\p{N}\-_. ]+/gu, '').slice(0, 120) || 'document.pdf';
}


