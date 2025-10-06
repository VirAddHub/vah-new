import { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.BACKEND_API_ORIGIN;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mailItemId = searchParams.get('mailItemId');
    const disposition = searchParams.get('disposition') || 'inline';

    if (!mailItemId) {
        return new Response('mailItemId required', { status: 400 });
    }

    if (!API_BASE) {
        return new Response('API base not configured', { status: 500 });
    }

    // Proxy to existing backend streaming endpoint: /api/mail-items/:id/download
    const auth = req.headers.get('authorization') || '';
    const upstream = await fetch(
        `${API_BASE}/api/mail-items/${encodeURIComponent(mailItemId)}/download?disposition=${encodeURIComponent(disposition)}`,
        {
            headers: {
                cookie: req.headers.get('cookie') || '',
                authorization: auth,
            },
            redirect: 'manual',
        }
    );

    const contentType = upstream.headers.get('content-type') || '';
    const isPdf = contentType.toLowerCase().includes('application/pdf');

    if (upstream.status === 200 && isPdf) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Cache-Control', 'private, max-age=0, no-store');
        headers.set(
            'Content-Disposition',
            `${disposition}; filename="${sanitizeFilename(`document-${mailItemId}.pdf`)}"`
        );
        return new Response(upstream.body, { status: 200, headers });
    }

    // Bubble original failure for easier debugging
    const text = await upstream.text();
    return new Response(text || 'Upstream error', { status: upstream.status || 500 });
}

function sanitizeFilename(name: string) {
    return name.replace(/[^\p{L}\p{N}\-_. ]+/gu, '').slice(0, 120) || 'document.pdf';
}


