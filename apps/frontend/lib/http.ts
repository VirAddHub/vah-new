/**
 * Unified API client for frontend
 * All requests go through BFF endpoints with cookie-based auth
 * No localStorage tokens needed - uses HttpOnly cookies
 */

export type ApiError = { ok: false; status: number; code?: string; message: string };
export type ApiOk<T> = { ok: true; data: T };
export type ApiResponse<T> = ApiOk<T> | ApiError;

function normaliseError(status: number, payload: any): ApiError {
    const code = payload?.code || payload?.error;
    const message = payload?.message || payload?.error || "Request failed";
    return { ok: false, status, code, message };
}

async function request<T>(
    path: string,
    opts: RequestInit & { base?: string } = {}
): Promise<ApiOk<T> | ApiError> {
    const base = opts.base ?? "/api/bff";
    const url = path.startsWith("http") ? path : `${base}${path}`;

    const res = await fetch(url, {
        credentials: "include",
        headers: {
            "content-type": "application/json",
            ...(opts.headers || {}),
        },
        ...opts,
    });

    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) return normaliseError(res.status, body);
    return (body?.ok !== undefined ? body : { ok: true, data: body }) as ApiOk<T>;
}

export const api = {
    get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "GET" }),
    post: <T>(path: string, body?: unknown, init?: RequestInit) =>
        request<T>(path, { ...init, method: "POST", body: body ? JSON.stringify(body) : undefined }),
    put: <T>(path: string, body?: unknown, init?: RequestInit) =>
        request<T>(path, { ...init, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
    del: <T>(path: string, init?: RequestInit) =>
        request<T>(path, { ...init, method: "DELETE" }),
};

/**
 * Safely parse JSON from a Response object
 * Returns null if parsing fails or response is not JSON
 * Note: This consumes the response body, so it can only be called once per response
 */
export async function safeJson(res: Response): Promise<any> {
    try {
        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();
        
        if (!text || !text.trim()) {
            return null;
        }
        
        if (!contentType.includes("application/json")) {
            return text;
        }
        
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
}

/**
 * Parse JSON from a Response, checking content-type first
 * Throws a clear error if response is not JSON or parsing fails
 * Use this when you expect JSON and want to fail fast with a clear error
 */
export async function parseJsonSafe(res: Response): Promise<any> {
    const contentType = res.headers.get('content-type') || '';
    
    if (!contentType.toLowerCase().includes('application/json')) {
        const text = await res.text().catch(() => 'Unable to read response');
        console.error('[parseJsonSafe] Expected JSON response, got text instead:', text.slice(0, 200));
        throw new Error(`Expected JSON, got: ${text.slice(0, 200)}`);
    }
    
    try {
        return await res.json();
    } catch (err) {
        const text = await res.text().catch(() => 'Unable to read response');
        console.error('[parseJsonSafe] Failed to parse JSON response:', text.slice(0, 200));
        throw new Error(`Failed to parse JSON: ${text.slice(0, 200)}`);
    }
}

export default api;
