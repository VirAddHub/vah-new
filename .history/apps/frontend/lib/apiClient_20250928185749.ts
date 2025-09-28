import { API_BASE } from "./config";

// Types for backward compatibility
export interface User {
    id: string;
    email: string;
    name?: string;
    first_name?: string | null;
    last_name?: string | null;
    is_admin?: boolean;
    role?: 'admin' | 'user';
    kyc_status?: 'pending' | 'verified' | 'rejected';
}

export interface MailItem {
    id: string;
    subject: string;
    sender: string;
    sender_name?: string;
    description?: string;
    received_at: string;
    status: 'unread' | 'read' | 'archived' | 'received' | 'scanned';
}

export interface ForwardingRequest {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    to_name?: string;
    to_address?: string;
    address1?: string;
    city?: string;
    postal?: string;
    tracking?: string;
    courier?: string;
}

export async function fetchJson<T = unknown>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers = new Headers(init.headers || { accept: "application/json" });
    let body = init.body;

    if (body && typeof body === "object" && !(body instanceof FormData)) {
        headers.set("content-type", "application/json");
        body = JSON.stringify(body);
    }

    const res = await fetch(url, { credentials: "include", ...init, headers, body });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : await res.text();

    if (!res.ok) {
        throw Object.assign(new Error("Request failed"), {
            status: res.status,
            payload: data,
        });
    }
    return data as T;
}

// Backward compatibility exports
export const apiClient = {
    async get(url: string) {
        try {
            const data = await fetchJson(url, { method: 'GET' });
            return { ok: true, data };
        } catch (error: any) {
            return { ok: false, message: error.message, status: error.status };
        }
    },
    async post(url: string, data?: any) {
        try {
            const result = await fetchJson(url, { method: 'POST', body: data });
            return { ok: true, data: result };
        } catch (error: any) {
            return { ok: false, message: error.message, status: error.status };
        }
    },
    async put(url: string, data?: any) {
        try {
            const result = await fetchJson(url, { method: 'PUT', body: data });
            return { ok: true, data: result };
        } catch (error: any) {
            return { ok: false, message: error.message, status: error.status };
        }
    },
    async delete(url: string) {
        try {
            const result = await fetchJson(url, { method: 'DELETE' });
            return { ok: true, data: result };
        } catch (error: any) {
            return { ok: false, message: error.message, status: error.status };
        }
    },
    async login(email: string, password: string) {
        try {
            const data = await fetchJson('/api/auth/login', {
                method: 'POST',
                body: { email, password }
            });
            return { ok: true, data };
        } catch (error: any) {
            return { ok: false, message: error.message, status: error.status };
        }
    },
    async whoami() {
        try {
            const data = await fetchJson('/api/auth/whoami');
            return { ok: true, data };
        } catch (error: any) {
            return { ok: false, message: error.message, status: error.status };
        }
    },
    async signup(email: string, password: string, firstName?: string, lastName?: string) {
        try {
            const data = await fetchJson('/api/auth/signup', {
                method: 'POST',
                body: { email, password, first_name: firstName, last_name: lastName }
            });
            return { ok: true, data };
        } catch (error: any) {
            return { ok: false, message: error.message, status: error.status };
        }
    }
};

export function safe<T>(v: any, fallback: T): T {
    return (v === null || v === undefined) ? fallback : v;
}

export const adminApi = {
    users: (params: URLSearchParams) => fetchJson(`/api/admin/users?${params.toString()}`),
    userStats: () => fetchJson('/api/admin/users/stats'),
    deleteUser: (id: string | number) => fetchJson(`/api/admin/users/${id}`, { method: 'DELETE' }),
    restoreUser: (id: string | number, body: any) => fetchJson(`/api/admin/users/${id}/restore`, {
        method: 'POST',
        body
    }),
    updateUser: (id: string, payload: any) => fetchJson(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: payload
    }),
    suspendUser: (id: string) => fetchJson(`/api/admin/users/${id}/suspend`, { method: 'PUT' }),
    activateUser: (id: string) => fetchJson(`/api/admin/users/${id}/activate`, { method: 'PUT' }),
    updateKyc: (id: string, status: string) => fetchJson(`/api/admin/users/${id}/kyc-status`, {
        method: 'PUT',
        body: { status }
    }),
    mailItems: (params: URLSearchParams) => fetchJson(`/api/admin/mail-items?${params.toString()}`),
    updateMailItem: (id: string, payload: any) => fetchJson(`/api/admin/mail-items/${id}`, {
        method: 'PATCH',
        body: payload
    })
};
