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
 */
export async function safeJson(res: Response): Promise<any> {
    try {
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const text = await res.text();
            return text || null;
        }
        const text = await res.text();
        if (!text || !text.trim()) {
            return null;
        }
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
}

export default api;
