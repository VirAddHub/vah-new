import { apiOrigin } from '@/lib/apiOrigin';

export async function GET() {
    try {
        const r = await fetch(`${apiOrigin()}/healthz`, { cache: 'no-store' });
        return new Response(JSON.stringify({ ok: r.ok }), { status: r.ok ? 200 : 502 });
    } catch (error: any) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 502 });
    }
}
