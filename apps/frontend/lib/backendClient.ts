/**
 * Unified backend client (no BFF).
 * Uses fetch with credentials and JSON helpers.
 * All requests go directly to BACKEND_API_ORIGIN with cookie-based auth.
 */

const BASE = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN ?? process.env.NEXT_PUBLIC_API_BASE ?? '';

if (!BASE && typeof window !== 'undefined') {
    // fail loud in dev
    if (process.env.NODE_ENV !== 'production') {
        console.warn('NEXT_PUBLIC_BACKEND_API_ORIGIN is not set. Set it to https://vah-api.onrender.com/api');
    }
}

type FetchOpts = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    signal?: AbortSignal;
    // when your backend needs no cookies, set to false
    credentials?: RequestCredentials;
};

export type ApiError = { ok: false; status: number; code?: string; message: string };
export type ApiOk<T> = { ok: true; data: T };
export type ApiResponse<T> = ApiOk<T> | ApiError;

async function request<T = unknown>(path: string, opts: FetchOpts = {}): Promise<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const { body, headers, method = 'GET', credentials = 'include', signal } = opts;

    const res = await fetch(url, {
        method,
        credentials,
        signal,
        headers: {
            'Accept': 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        // Important for Render/Vercel: let backend set CORS; client sends cookies.
        cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : (await res.text() as any);

    if (!res.ok) {
        // Normalize error response
        const errorMsg = data?.message || data?.error || res.statusText || 'Request failed';
        return {
            ok: false,
            status: res.status,
            code: data?.code || data?.error,
            message: errorMsg,
        };
    }

    // Normalize success response
    if (data?.ok !== undefined) {
        return data as ApiResponse<T>;
    }
    return { ok: true, data } as ApiOk<T>;
}

export const backendClient = {
    get: <T = unknown>(p: string, o?: Omit<FetchOpts, 'method' | 'body'>) => request<T>(p, { ...o, method: 'GET' }),
    post: <T = unknown>(p: string, body?: any, o?: Omit<FetchOpts, 'method' | 'body'>) => request<T>(p, { ...o, method: 'POST', body }),
    put: <T = unknown>(p: string, body?: any, o?: Omit<FetchOpts, 'method' | 'body'>) => request<T>(p, { ...o, method: 'PUT', body }),
    patch: <T = unknown>(p: string, body?: any, o?: Omit<FetchOpts, 'method' | 'body'>) => request<T>(p, { ...o, method: 'PATCH', body }),
    del: <T = unknown>(p: string, o?: Omit<FetchOpts, 'method' | 'body'>) => request<T>(p, { ...o, method: 'DELETE' }),
};

export default backendClient;

