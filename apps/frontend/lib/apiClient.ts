// apps/frontend/lib/apiClient.ts

// Re-export types & helpers for components
export type {
    ApiOk,
    ApiErr,
    ApiResponse,
    MailItem,
    ForwardingRequest,
} from './api-client';
export type { User } from '../types/user';
export { safe } from './api-client';

import { API_BASE } from './config';
import { apiClient as legacyClient } from './api-client';
import type {
    ApiResponse,
    User,
    MailItem,
    ForwardingRequest,
} from './api-client';
import { getToken } from './token-manager';

type ReqInit = RequestInit & { headers?: HeadersInit };

const j = (v: any) =>
    v && typeof v === 'object' && !(v instanceof FormData) ? JSON.stringify(v) : v;

async function fetchJson<T = any>(path: string, init: ReqInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const isForm = init.body instanceof FormData;
    const token = getToken();

    const headers: HeadersInit = {
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
        ...(!isForm && init.body && typeof init.body === 'object'
            ? { 'content-type': 'application/json' }
            : {}),
    };

    const res = await fetch(url, { credentials: 'include', ...init, headers, body: j(init.body) });
    const text = await res.text();

    let data: any;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

    if (!res.ok) {
        return { ok: false, message: (data?.message ?? res.statusText), status: res.status } as any;
    }

    // If backend already returns { ok, data }, don't wrap again
    if (data && typeof data === 'object' && 'ok' in data) return data as T;

    return { ok: true, data } as T;
}

// ---------- Generic HTTP helpers (typed to ApiResponse<any> by default) ----------
function get<T = any>(path: string, init?: ReqInit): Promise<ApiResponse<T>> {
    return fetchJson<ApiResponse<T>>(path, { ...init, method: 'GET' });
}
function post<T = any>(path: string, body?: any, init?: ReqInit): Promise<ApiResponse<T>> {
    return fetchJson<ApiResponse<T>>(path, { ...init, method: 'POST', body });
}
function put<T = any>(path: string, body?: any, init?: ReqInit): Promise<ApiResponse<T>> {
    return fetchJson<ApiResponse<T>>(path, { ...init, method: 'PUT', body });
}
function patch<T = any>(path: string, body?: any, init?: ReqInit): Promise<ApiResponse<T>> {
    return fetchJson<ApiResponse<T>>(path, { ...init, method: 'PATCH', body });
}
function del<T = any>(path: string, init?: ReqInit): Promise<ApiResponse<T>> {
    return fetchJson<ApiResponse<T>>(path, { ...init, method: 'DELETE' });
}

// ---- Billing helpers (user + admin) ----
const billing = {
    getBilling: () => get<{ [k: string]: any }>('/api/billing'),
    getInvoices: () => get<{ items: any[] }>('/api/admin/invoices'),           // admin list
    getSubscriptionStatus: () => get<{ subscription: any }>('/api/billing/subscription-status'),
    createRedirectFlow: () => post<{ redirect_url: string }>('/api/billing/create-redirect-flow'),
    getInvoiceLink: (invoiceId: string) => get<{ url: string }>(`/api/admin/invoices/${invoiceId}/link`), // admin link
    getAdminTransactions: (params: { page?: number; page_size?: number }) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.set('page', String(params.page));
        if (params.page_size) searchParams.set('page_size', String(params.page_size));
        return get<{ items: any[]; total?: number }>(`/api/admin/transactions?${searchParams.toString()}`);
    },
    manageSubscription: (action: 'pause' | 'resume' | 'cancel') =>
        post<{ ok: true; message?: string }>('/api/billing/subscription/manage', { action }),
};

// ---- Admin helpers (mail/forwarding + existing) ----
const adminApi = {
    users: (params: URLSearchParams) =>
        get<User[]>(`/api/admin/users?${params.toString()}`),

    userStats: () =>
        get<{ total: number; active: number; suspended: number; pending: number; deleted: number }>(
            '/api/admin/users/stats'
        ),

    deleteUser: (id: string | number) => del<{ deleted: number }>(`/api/admin/users/${id}`),

    restoreUser: (
        id: string | number,
        body: { email: string; first_name?: string; last_name?: string; reactivate?: boolean },
    ) => post<{ restored: number }>(`/api/admin/users/${id}/restore`, body),

    updateUser: (id: string | number, payload: any) => patch(`/api/admin/users/${id}`, payload),
    suspendUser: (id: string) => put(`/api/admin/users/${id}/suspend`, {}),
    activateUser: (id: string) => put(`/api/admin/users/${id}/activate`, {}),
    updateKyc: (id: string, status: string) => put(`/api/admin/users/${id}/kyc-status`, { status }),

    getPlans: () => get<any[]>('/api/admin/plans'),

    analytics: (timeRange: string) =>
        get<any>(`/api/admin/analytics?range=${encodeURIComponent(timeRange)}`),

    billingMetrics: () => get<any>('/api/admin/billing/metrics'),

    forwardingQueue: (params: URLSearchParams) =>
        get<{ items: ForwardingRequest[]; total: number }>(
            `/api/admin/forwarding/queue?${params.toString()}`
        ),

    cancelForward: (id: string) => post(`/api/admin/forwarding/${id}/cancel`, {}),

    mailItems: (params: URLSearchParams) =>
        get<{ items: MailItem[]; total: number }>(`/api/admin/mail-items?${params.toString()}`),

    updateMailItem: (id: string, payload: any) => patch(`/api/admin/mail-items/${id}`, payload),
};

// ---- Mail API (unified) ----
import type { MailItem, MailItemDetails } from '../types/mail';
import type { ApiResponse } from '../types/api';

// --- mappers (normalize fields) ---
const mapMailItem = (raw: any): MailItem => ({
    id: String(raw.id),
    subject: raw.subject ?? '',
    sender_name: raw.sender_name ?? raw.sender ?? null,
    received_at: raw.received_at ?? raw.received_date ?? raw.received ?? new Date().toISOString(),
    status: raw.status ?? 'received',
    tag: raw.tag ?? null,
    scan_url: raw.scan_url ?? raw.scanUrl ?? null,
    is_read: typeof raw.is_read === 'boolean' ? raw.is_read : (raw.status === 'read'),
});

const mapMailDetails = (raw: any): MailItemDetails => ({
    ...mapMailItem(raw),
    file_size: raw.file_size ?? null,
    notes: raw.notes ?? null,
    pages: raw.pages ?? null,
});

export const mailApi = {
    async list(): Promise<ApiResponse<MailItem[]>> {
        try {
            const data = await get('/api/mail-items');
            const items = Array.isArray(data?.data ?? data) ? (data.data ?? data) : [];
            return { ok: true, data: items.map(mapMailItem) };
        } catch (e: any) {
            return { ok: false, error: e?.message ?? 'Failed to load mail', code: e?.status };
        }
    },

    async get(id: string): Promise<ApiResponse<MailItemDetails>> {
        try {
            const data = await get(`/api/mail-items/${id}`);
            const obj = data?.data ?? data;
            return { ok: true, data: mapMailDetails(obj) };
        } catch (e: any) {
            return { ok: false, error: e?.message ?? 'Mail not found', code: e?.status };
        }
    },

    async markRead(id: string): Promise<ApiResponse<{ id: string; status: 'read' }>> {
        try {
            const data = await patch(`/api/mail-items/${id}`, { is_read: true });
            const obj = data?.data ?? data ?? {};
            return { ok: true, data: { id: String(obj.id ?? id), status: 'read' } };
        } catch (e: any) {
            return { ok: false, error: e?.message ?? 'Failed to mark as read', code: e?.status };
        }
    },

    async downloadScan(id: string): Promise<Blob> {
        const response = await fetch(`${API_BASE}/api/mail-items/${id}/scan-url`, {
            headers: {
                authorization: `Bearer ${getToken()}`,
            },
        });
        if (!response.ok) throw new Error('Failed to get download URL');
        const { url } = await response.json();

        const blobResponse = await fetch(url);
        if (!blobResponse.ok) throw new Error('Failed to download file');
        return blobResponse.blob();
    },
};

// ---- User-domain helpers so components get typed data ----
const userDomain = {
    getKycStatus: () =>
        get<{ status: 'pending' | 'verified' | 'rejected';[k: string]: any }>(
            '/api/kyc/status'
        ),

    submitBusinessInfo: (data: Record<string, unknown>) =>
        post<{ ok: true; message?: string }>('/api/kyc/business-info', data),

    startKyc: () => post<{ url: string }>('/api/kyc/start'),

    getProfile: () => get<{ user: User }>('/api/profile'),

    getMailItems: () => get<{ items: MailItem[] }>('/api/mail-items'),

    getMailItem: (id: string) => get<{ description?: string }>(`/api/mail-items/${id}`),

    getMailScanUrl: (id: string) => get<{ url: string }>(`/api/mail-items/${id}/scan-url`),

    getMailDownloadLink: (id: string) =>
        get<{ url: string }>(`/api/mail-items/${id}/download-link`),

    markMailRead: (id: string) => post<{ ok: true }>(`/api/mail-items/${id}/mark-read`),

    getSupportTickets: () => get<{ items: any[] }>('/api/support/tickets'),

    createSupportTicket: (data: { subject: string; message: string }) =>
        post<{ ok: true; message?: string }>('/api/support/tickets', data),

    closeSupportTicket: (ticketId: string) =>
        post<{ ok: true; message?: string }>(`/api/support/tickets/${ticketId}/close`),

    getForwardingRequests: () =>
        get<{ items: ForwardingRequest[] }>('/api/forwarding-requests'),

    createForwardingRequest: (data: { mailItemId: string; destinationAddress: string }) =>
        post<{ ok: true; message?: string }>('/api/forwarding-requests', data),

    getPlans: () => get<{ items: any[] }>('/api/plans'),

    getEmailPrefs: () => get<{ [k: string]: any }>('/api/email-prefs'),

    // Payments (user)
    getInvoicesUser: () => get<{ items: any[] }>('/api/billing/invoices'),
    getInvoiceLinkUser: (invoiceId: string) =>
        get<{ url: string }>(`/api/billing/invoices/${invoiceId}/link`),

    createPaymentRedirect: (data: { planId: string }) =>
        post<{ url: string }>('/api/payments/redirect-flows', data),

    getSubscriptionStatusUser: () =>
        get<{ subscription: any }>('/api/payments/subscriptions/status'),
};

// ---- Unified export ----
export const apiClient = {
    ...legacyClient,
    get, post, put, patch, delete: del,
    ...billing,
    adminApi,
    mailApi,
    ...userDomain,
};

export { adminApi };

// Export fetchJson for advanced usage
export { fetchJson };