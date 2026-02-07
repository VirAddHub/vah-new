/**
 * @deprecated This API client is deprecated. Use `import api from "@/lib/http"` instead.
 * 
 * Migration guide:
 * - Replace `import { apiClient } from "@/lib/apiClient"` with `import api from "@/lib/http"`
 * - Replace `apiClient.get()` with `api.get()`
 * - Replace `apiClient.post()` with `api.post()`
 * - Error handling: Check `res.ok` instead of `isOk(res)`
 * 
 * This file will be removed after all usages are migrated.
 */
// apps/frontend/lib/apiClient.ts

// Dev-only deprecation warning
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    const warnOnce = () => {
        if (!(window as any).__apiClientDeprecationWarned) {
            console.warn(
                '[DEPRECATED] "@/lib/apiClient" is deprecated. Use "@/lib/http" instead. ' +
                'See migration guide in lib/apiClient.ts'
            );
            (window as any).__apiClientDeprecationWarned = true;
        }
    };
    // Warn on module load
    setTimeout(warnOnce, 0);
}

// Re-export types & helpers for components
export type { User } from '../types/user';
export type { ApiResponse } from '../types/api';
export { safe } from './api-client';

import { API_BASE } from './config';
import { apiClient as legacyClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type { MailItem, MailItemDetails } from '../types/mail';
import type { User } from '../types/user';
import type { ForwardingRequest } from './api-client';



type ReqInit = RequestInit & { headers?: HeadersInit };

const j = (v: any) =>
    v && typeof v === 'object' && !(v instanceof FormData) ? JSON.stringify(v) : v;

async function fetchJson<T = any>(path: string, init: ReqInit = {}): Promise<T> {
    // All /api/admin/* and /api/bff/* routes are BFF routes (relative paths)
    // Only use API_BASE for legacy direct backend calls (should be avoided)
    const url = path.startsWith('http')
        ? path
        : path.startsWith('/api/bff') || path.startsWith('/api/admin')
            ? path  // BFF routes are relative to frontend origin
            : `${API_BASE}${path}`;
    const isForm = init.body instanceof FormData;

    // Phase B: Cookie-only auth
    // No explicit Authorization header needed - automatic via credentials: 'include'

    // Phase D: CSRF Protection
    // Read vah_csrf_token from document.cookie (client-side only behavior)
    let csrfToken = '';
    const getCookie = (name: string) => {
        if (typeof document === 'undefined') return '';
        const match = document.cookie.match(new RegExp(`(^|;)\\s*${name}=([^;]+)`));
        return match ? match[2] : '';
    };

    if (init.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method.toUpperCase())) {
        csrfToken = getCookie('vah_csrf_token');
        if (!csrfToken) {
            // Safety fallback: if missing, force a refresh via HEAD request
            // This ensures the backend sets the cookie if it wasn't there
            try {
                await fetch('/api/auth/csrf', { method: 'HEAD', cache: 'no-store' });
                csrfToken = getCookie('vah_csrf_token');
            } catch (e) {
                console.warn('Failed to refresh CSRF token', e);
            }
        }
    }

    const headers: HeadersInit = {
        accept: 'application/json',
        ...(init.headers || {}),
        ...(!isForm && init.body && typeof init.body === 'object'
            ? { 'content-type': 'application/json' }
            : {}),
    };

    // Attach CSRF token for mutating requests
    if (csrfToken && init.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method.toUpperCase())) {
        (headers as any)['X-CSRF-Token'] = csrfToken;
    }



    const res = await fetch(url, { ...init, credentials: 'include', headers, body: j(init.body) });
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
    getAdminTransactions: (params: { page?: number; pageSize?: number }) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.set('page', String(params.page));
        if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
        return get<{ items: any[]; total?: number }>(`/api/admin/transactions?${searchParams.toString()}`);
    },
    manageSubscription: (action: 'pause' | 'resume' | 'cancel') =>
        post<{ ok: true; message?: string }>('/api/billing/subscription/manage', { action }),
};

// ---- Admin helpers (mail/forwarding + existing) ----
const adminApi = {
    users: (params: URLSearchParams) =>
        get<User[]>(`/api/admin/users?${params.toString()}`),

    deletedUsers: (params: URLSearchParams) =>
        get<User[]>(`/api/admin/users/deleted?${params.toString()}`),

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
    gdpr_expired: Boolean(raw.gdpr_expired),
});

const mapMailDetails = (raw: any): MailItemDetails => ({
    ...mapMailItem(raw),
    file_size: raw.file_size ?? null,
    notes: raw.notes ?? null,
    pages: raw.pages ?? null,
});

// --- helpers: ensure shape matches shared ApiErr exactly ---
const ok = <T,>(data: T): ApiResponse<T> => ({ ok: true, data });
const err = <T = never>(error: string, code?: number): ApiResponse<T> => ({ ok: false, error, code });

export const mailApi = {
    async list(): Promise<ApiResponse<MailItem[]>> {
        try {
            const data = await get('/api/mail-items');
            if (!data.ok) return data as ApiResponse<MailItem[]>;
            // Backend returns: { ok: true, items: [...], total: 123, page: 1, pageSize: 20 }
            const items = Array.isArray((data as any).items) ? (data as any).items : [];
            return ok(items.map(mapMailItem));
        } catch (e: any) {
            return err(e?.message ?? 'Failed to load mail', e?.status);
        }
    },

    async get(id: string): Promise<ApiResponse<MailItemDetails>> {
        try {
            const data = await get(`/api/mail-items/${id}`);
            if (!data.ok) return data as ApiResponse<MailItemDetails>;
            // Backend returns: { ok: true, data: {...} }
            const obj = data.data ?? data;
            return ok(mapMailDetails(obj));
        } catch (e: any) {
            return err(e?.message ?? 'Mail not found', e?.status);
        }
    },

    async markRead(id: string): Promise<ApiResponse<{ id: string; status: 'read' }>> {
        try {
            const data = await patch(`/api/mail-items/${id}`, { is_read: true });
            if (!data.ok) return data as ApiResponse<{ id: string; status: 'read' }>;
            const obj = data.data ?? data ?? {};
            return ok({ id: String(obj.id ?? id), status: 'read' });
        } catch (e: any) {
            return err(e?.message ?? 'Failed to mark as read', e?.status);
        }
    },

    async downloadScan(id: string): Promise<Blob> {
        // Use the BFF route (relative path - handled by Next.js) for secure PDF streaming
        const response = await fetch(`/api/bff/mail/scan-url?mailItemId=${id}&disposition=attachment`, {
            credentials: 'include', // Include vah_session cookie
            cache: 'no-store',
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Download failed');
            throw new Error(errorText || `Failed to download file (${response.status})`);
        }
        return response.blob();
    },
};

// ---- Contact API ----
export const contactApi = {
    async send(payload: { name: string; email: string; message: string; inquiryType?: string; website?: string }): Promise<ApiResponse<{ sent: true }>> {
        try {
            const data = await post('/api/contact', payload);
            if (!data.ok) return data as ApiResponse<{ sent: true }>;
            // Accept either {ok:true,data:{...}} or plain {sent:true} from server
            const body = data.data ?? data;
            if (body?.ok === true && body?.data) return { ok: true, data: body.data };
            if (body?.sent === true) return { ok: true, data: { sent: true } };
            return { ok: false, error: body?.error ?? 'Failed to send message' };
        } catch (e: any) {
            return err(e?.response?.data?.error ?? e?.message ?? 'Failed to send message', e?.response?.status);
        }
    },
};

// ---- Support API ----
export type SupportInfo = {
    email?: string;
    whatsapp?: string;
    hours?: string;
    phone?: string;
    [k: string]: unknown;
};

export const supportApi = {
    async get(): Promise<ApiResponse<SupportInfo>> {
        try {
            const data = await get<SupportInfo>('/api/support');
            if (!data.ok) return data;
            const body = data.data ?? data;
            if (body && typeof body === 'object') return { ok: true, data: body as SupportInfo };
            return { ok: false, error: 'Failed to load support info' };
        } catch (e: any) {
            return {
                ok: false,
                error: e?.response?.data?.error ?? 'Failed to load support info',
                code: e?.response?.status,
            };
        }
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

    getMailItems: () => get<{ items: MailItem[]; total: number; page: number; pageSize: number }>('/api/mail-items'),

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

// ---- Forwarding API ----
import type { CreateForwardingPayload, ForwardingResponse } from '../types/api';
import { isOk } from '../types/api';

const forwardingApi = {
    async create(payload: CreateForwardingPayload): Promise<ApiResponse<ForwardingResponse>> {
        try {
            const res = await post<ForwardingResponse>('/api/forwarding/requests', payload);
            return res;
        } catch (e: any) {
            return {
                ok: false,
                error: e?.response?.data?.error ?? 'Failed to create forwarding request',
                code: e?.response?.status
            };
        }
    },
};

const adminForwardingApi = {
    async list(params?: { page?: number; page_size?: number; status?: string; q?: string }): Promise<ApiResponse<any[]>> {
        try {
            const searchParams = new URLSearchParams();
            if (params?.page) searchParams.set('page', String(params.page));
            if (params?.page_size) searchParams.set('page_size', String(params.page_size));
            if (params?.status) searchParams.set('status', params.status);
            if (params?.q) searchParams.set('q', params.q);

            const res = await get<any>(`/api/admin/forwarding/requests?${searchParams.toString()}`);
            if (isOk(res) && Array.isArray(res.data)) {
                return { ok: true, data: res.data };
            }
            if (isOk(res) && res.data?.data && Array.isArray(res.data.data)) {
                return { ok: true, data: res.data.data };
            }
            return { ok: false, error: 'Invalid response format' };
        } catch (e: any) {
            return {
                ok: false,
                error: e?.response?.data?.error ?? 'Failed to load forwarding requests',
                code: e?.response?.status
            };
        }
    },
};

// ---- Unified export ----
export const apiClient = {
    ...legacyClient,
    get, post, put, patch, delete: del,
    ...billing,
    adminApi,
    mailApi,
    ...userDomain,
    forwardingApi,
    adminForwardingApi,
};

export { adminApi, forwardingApi, adminForwardingApi };

// Export fetchJson for advanced usage
export { fetchJson };