import { getBackendApiBaseUrl } from '@/lib/server/backendOrigin';

/**
 * Lightweight OK probe for monitors. Uses the same origin resolution as other BFF routes
 * (staging fallback in dev when NEXT_PUBLIC_BACKEND_API_ORIGIN is unset). Do not use
 * lib/apiOrigin — when env is empty it becomes "/api" and fetch("/api/healthz") never hits Render.
 */
export async function GET() {
    try {
        const r = await fetch(`${getBackendApiBaseUrl()}/healthz`, { cache: 'no-store' });
        return new Response(JSON.stringify({ ok: r.ok }), { status: r.ok ? 200 : 502 });
    } catch (error: any) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 502 });
    }
}
