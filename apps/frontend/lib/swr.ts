// lib/swr.ts
// Global SWR fetcher and error handling utilities

export class ApiError extends Error {
    status?: number;
    info?: unknown;

    constructor(message: string, status?: number, info?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.info = info;
    }
}

/**
 * JSON fetcher for SWR
 * Automatically includes credentials and handles errors
 * Checks content-type before parsing to avoid "Unexpected token" errors
 */
export async function jsonFetcher<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: {
            accept: 'application/json',
            ...(init?.headers || {}),
        },
        credentials: 'include',
    });

    const contentType = res.headers.get("content-type") || "";

    // If not JSON, read as text and throw a clearer error
    if (!contentType.toLowerCase().includes("application/json")) {
        const text = await res.text().catch(() => "");
        const snippet = text.slice(0, 200);

        const error = new ApiError(
            `Upstream did not return JSON (status ${res.status}). Snippet: ${snippet}`,
            res.status,
            { contentType, bodySnippet: snippet }
        );
        throw error;
    }

    let data: unknown;
    try {
        data = await res.json();
    } catch (err) {
        const text = await res.text().catch(() => "");
        const snippet = text.slice(0, 200);
        const error = new ApiError(
            `Failed to parse JSON (status ${res.status}). Snippet: ${snippet}`,
            res.status,
            { contentType, bodySnippet: snippet, parseError: err }
        );
        throw error;
    }

    if (!res.ok) {
        const obj = data as Record<string, unknown> | null | undefined;
        const message = (obj?.error ?? obj?.message ?? res.statusText) as string;
        throw new ApiError(message, res.status, data);
    }

    return data as T;
}

/**
 * Fetcher that supports both string keys and [url, params] tuple keys
 */
export async function flexFetcher<T>(key: string | readonly [string, Record<string, unknown>]): Promise<T> {
    if (typeof key === 'string') {
        return jsonFetcher<T>(key);
    }

    const [url, params] = key;
    const searchParams = new URLSearchParams();

    // Build query string from params object
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
            searchParams.append(k, String(v));
        }
    });

    const fullUrl = `${url}?${searchParams.toString()}`;
    return jsonFetcher<T>(fullUrl);
}
