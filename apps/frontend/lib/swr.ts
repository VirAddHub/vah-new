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

    if (!res.ok) {
        let info: any = null;
        try {
            info = await res.json();
        } catch {
            // Response body might not be JSON
        }

        const message = info?.error ?? info?.message ?? res.statusText;
        throw new ApiError(message, res.status, info);
    }

    return res.json() as Promise<T>;
}

/**
 * Fetcher that supports both string keys and [url, params] tuple keys
 */
export async function flexFetcher<T>(key: string | readonly [string, any]): Promise<T> {
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
