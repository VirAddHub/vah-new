// app/lib/api.ts
// Centralized API client with proper credentials and error handling

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${path}`;

    const response = await fetch(url, {
        ...init,
        credentials: 'include', // ✅ Always send cookies for auth
        headers: {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
}

// Convenience methods
export const apiClient = {
    get: <T>(path: string) => api<T>(path, { method: 'GET' }),
    post: <T>(path: string, data?: any) => api<T>(path, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    }),
    put: <T>(path: string, data?: any) => api<T>(path, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    }),
    delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
};

// Legacy compatibility - re-export as 'api' for existing code
export { apiClient as api };
