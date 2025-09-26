// ---- Types ----------------------------------------------------

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; message: string; code?: string; status?: number };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

// Type guard function to safely check if response is successful
export function isOk<T>(r: ApiResponse<T> | unknown): r is ApiOk<T> {
  return !!r && typeof r === "object" && (r as any).ok === true;
}

// Match your backend fields (snake_case). Add/trim fields to match your app.
export interface User {
  id: string;                    // keep as string; backend often returns text ids
  email: string;
  name?: string;                 // display name
  first_name?: string | null;
  last_name?: string | null;
  is_admin?: boolean;            // backend uses is_admin
  role?: 'admin' | 'user' | string;
  kyc_status?: 'pending' | 'verified' | 'rejected';
  // ...any other fields you expect (plan_id, created_at, etc.)
}

// Additional types used throughout the app
export interface MailItem {
  id: string;
  subject: string;
  sender: string;
  sender_name?: string;
  description?: string;
  received_at: string;
  status: 'unread' | 'read' | 'archived' | 'received' | 'scanned';
  // ... other mail fields
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
  // ... other forwarding fields
}

// ---- Helpers --------------------------------------------------

// Safe helper to guard undefined data
export function safe<T>(v: any, fallback: T): T {
  return (v === null || v === undefined) ? fallback : v;
}

// Safely pick a boolean from unknown values like "true"/1/"1"/true
const toBool = (v: unknown): boolean | undefined => {
  if (v === true || v === false) return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  if (typeof v === 'number') return v === 1;
  return undefined;
};

// Accepts { user: ... } or a bare user object. Normalizes minimal shape.
function normalizeUserPayload(input: unknown): User | null {
  if (!input) return null;

  // shape A: { user: {...} }
  const maybeUser = (input as any)?.user ?? input;

  if (typeof maybeUser !== 'object' || maybeUser === null) return null;

  const u = maybeUser as any;

  const id =
    u.id != null
      ? String(u.id)
      : u.user_id != null
        ? String(u.user_id)
        : undefined;

  const email = typeof u.email === 'string' ? u.email : undefined;

  const first_name =
    typeof u.first_name === 'string'
      ? u.first_name
      : typeof u.firstName === 'string'
        ? u.firstName
        : undefined;

  const last_name =
    typeof u.last_name === 'string'
      ? u.last_name
      : typeof u.lastName === 'string'
        ? u.lastName
        : undefined;

  const name =
    typeof u.name === 'string'
      ? u.name
      : first_name && last_name
        ? `${first_name} ${last_name}`
        : first_name || last_name || undefined;

  const is_admin =
    toBool(u.is_admin) ??
    toBool(u.isAdmin) ??
    (typeof u.role === 'string' ? u.role.toLowerCase() === 'admin' : undefined);

  const role =
    typeof u.role === 'string'
      ? (u.role as User['role'])
      : is_admin === true
        ? 'admin'
        : is_admin === false
          ? 'user'
          : undefined;

  if (!id || !email) return null;

  // Preserve additional fields without changing your backend naming
  const rest: Record<string, unknown> = {};
  for (const k of Object.keys(u)) {
    if (!['id', 'user_id', 'email', 'first_name', 'firstName', 'last_name', 'lastName', 'is_admin', 'isAdmin', 'role'].includes(k)) {
      (rest as any)[k] = u[k];
    }
  }

  return {
    id,
    email,
    name,
    first_name,
    last_name,
    is_admin,
    role,
    ...(rest as any),
  };
}

// Re-shape any ApiResponse<unknown> from /login or /whoami into ApiResponse<{user: User}>
function coerceUserResponse(resp: ApiResponse<unknown>): ApiResponse<{ user: User }> {
  if (!resp.ok) return resp as ApiErr;

  const user = normalizeUserPayload((resp as ApiOk<unknown>).data);
  if (user) return { ok: true, data: { user } };

  // If the backend sent { user: ... } nested, try that too
  const nested = normalizeUserPayload((resp as ApiOk<any>).data?.user);
  if (nested) return { ok: true, data: { user: nested } };

  return { ok: false, message: 'Invalid user payload', status: 500 };
}

// ---- Unified API Client ----------------------------------------------

// Core request function - always hits Next.js proxy routes
export async function req<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const r = await fetch(path, {
    ...init,
    // browser requests must send cookies to Next API (same-site)
    credentials: "include",
    headers: {
      ...(init?.headers || {}),
      "content-type": "application/json",
    },
    cache: "no-store",
  });

  let json: any = null;
  try { json = await r.json(); } catch { json = null; }

  if (!r.ok) {
    const err: ApiErr = {
      ok: false,
      message: json?.message || json?.error || r.statusText || "Request failed",
      status: r.status,
      code: json?.code,
    };
    return err;
  }

  const ok: ApiOk<T> = { ok: true, data: (json as T) };
  return ok;
}

// Legacy request function that returns ApiResponse format
async function legacyReq<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    return await req<T>(path, init);
  } catch (error: any) {
    return { ok: false, message: error.message, status: error.status };
  }
}

// ---- Legacy API Client (for backward compatibility) ----

export const apiClient = {
  // Always return ApiResponse<{ user: User }>
  async login(email: string, password: string): Promise<ApiResponse<{ user: User }>> {
    if (!email || !password) {
      return { ok: false, message: 'Email and password are required', status: 400 };
    }
    const resp = await legacyReq('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return coerceUserResponse(resp);
  },

  async whoami(): Promise<ApiResponse<{ user: User }>> {
    const resp = await legacyReq('/api/auth/whoami', { method: 'GET' });
    return coerceUserResponse(resp);
  },

  async signup(
    email: string,
    password: string,
    first_name: string,
    last_name: string
  ): Promise<ApiResponse<{ user: User }>> {
    const resp = await legacyReq('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name, last_name }),
    });
    return coerceUserResponse(resp);
  },

  async logout(): Promise<ApiResponse<{ success: true }>> {
    return legacyReq<{ success: true }>('/api/auth/logout', { method: 'POST' });
  },

  // Generic HTTP methods
  async get<T = any>(path: string): Promise<ApiResponse<T>> {
    return legacyReq<T>(path, { method: 'GET' });
  },

  async post<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
    return legacyReq<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
    return legacyReq<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return legacyReq<T>(path, { method: 'DELETE' });
  },

  async patch<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
    return legacyReq<T>(path, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  // Convenience methods for common endpoints
  async getBilling(): Promise<ApiResponse<any>> {
    return this.get('/api/billing');
  },

  async getInvoices(): Promise<ApiResponse<any>> {
    return this.get('/api/billing/invoices');
  },

  async getSubscriptionStatus(): Promise<ApiResponse<any>> {
    return this.get('/api/payments/subscriptions/status');
  },

  async getMailItems(): Promise<ApiResponse<any>> {
    return this.get('/api/mail-items');
  },

  async getForwardingRequests(): Promise<ApiResponse<any>> {
    return this.get('/api/forwarding-requests');
  },

  async getKycStatus(): Promise<ApiResponse<any>> {
    return this.get('/api/kyc/status');
  },

  async getMailScanUrl(itemId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/mail-items/${itemId}/scan-url`);
  },

  async submitBusinessInfo(data: any): Promise<ApiResponse<any>> {
    return this.post('/api/kyc/business-info', data);
  },

  async startKyc(): Promise<ApiResponse<any>> {
    return this.post('/api/kyc/start');
  },

  async createRedirectFlow(): Promise<ApiResponse<any>> {
    return this.post('/api/payments/redirect-flows');
  },

  async getInvoiceLink(invoiceId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/billing/invoices/${invoiceId}/link`);
  },

  async manageSubscription(action: string): Promise<ApiResponse<any>> {
    return this.post('/api/payments/subscriptions/manage', { action });
  },

  // Admin Mail Management
  async getAdminMailItems(params: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/mail-items${queryString ? `?${queryString}` : ''}`);
  },

  async createAdminMailItem(payload: any): Promise<ApiResponse<any>> {
    return this.post('/api/admin/mail-items', payload);
  },

  async updateAdminMailItem(id: string, payload: any): Promise<ApiResponse<any>> {
    return this.patch(`/api/admin/mail-items/${id}`, payload);
  },

  // Admin Billing
  async getAdminBillingMetrics(): Promise<ApiResponse<any>> {
    return this.get('/api/admin/billing/metrics');
  },

  async getAdminTransactions(params: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/transactions${queryString ? `?${queryString}` : ''}`);
  },

  // Admin Users
  async getAdminUsers(params: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
  },

  async createAdminUser(payload: any): Promise<ApiResponse<any>> {
    return this.post('/api/admin/users', payload);
  },

  async updateAdminUser(id: string, payload: any): Promise<ApiResponse<any>> {
    return this.put(`/api/admin/users/${id}`, payload);
  },

  async suspendAdminUser(id: string): Promise<ApiResponse<any>> {
    return this.put(`/api/admin/users/${id}/suspend`);
  },

  async activateAdminUser(id: string): Promise<ApiResponse<any>> {
    return this.put(`/api/admin/users/${id}/activate`);
  },

  async updateUserKycStatus(id: string, status: string): Promise<ApiResponse<any>> {
    return this.put(`/api/admin/users/${id}/kyc-status`, { status });
  },

  async getAdminUserStats(): Promise<ApiResponse<any>> {
    return this.get('/api/admin/users/stats');
  },

  // Admin Forwarding
  async getAdminForwardingQueue(params: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/admin/forwarding/queue${queryString ? `?${queryString}` : ''}`);
  },

  async fulfillForwarding(id: string, payload: any): Promise<ApiResponse<any>> {
    return this.post(`/api/admin/forwarding/requests/${id}/fulfill`, payload);
  },

  async cancelForwarding(id: string): Promise<ApiResponse<any>> {
    return this.post(`/api/admin/forwarding/requests/${id}/cancel`);
  },

  // Admin Analytics
  async getAdminAnalytics(range: string = '30d'): Promise<ApiResponse<any>> {
    return this.get(`/api/admin/analytics?range=${range}`);
  },
};

// ---- New Simplified Admin API Client ----

// Admin helpers (all via proxy) - returns ApiResponse format for compatibility
export const adminApi = {
  users: (params: URLSearchParams) => legacyReq<{ items: any[]; total: number }>(`/api/admin/users?${params.toString()}`),
  userStats: () => legacyReq<{ total: number; active: number; suspended: number; pending: number; deleted: number }>('/api/admin/users/stats'),
  deleteUser: (id: string | number) => legacyReq<{ deleted: number }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  restoreUser: (id: string | number, body: { email: string; first_name?: string; last_name?: string; reactivate?: boolean }) =>
    legacyReq<{ restored: number }>(`/api/admin/users/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateUser: (id: string, payload: any) => legacyReq(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  suspendUser: (id: string) => legacyReq(`/api/admin/users/${id}/suspend`, { method: 'PUT' }),
  activateUser: (id: string) => legacyReq(`/api/admin/users/${id}/activate`, { method: 'PUT' }),
  updateKyc: (id: string, status: string) => legacyReq(`/api/admin/users/${id}/kyc-status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Mail Management
  mailItems: (params: URLSearchParams) => legacyReq<{ items: any[]; total: number }>(`/api/admin/mail-items?${params.toString()}`),
  updateMailItem: (id: string, payload: Partial<{ tag: string; status: string }>) =>
    legacyReq<{ id: string }>(`/api/admin/mail-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Billing & Revenue
  billingMetrics: () => legacyReq<{ monthly_revenue_pence: number | string; outstanding_invoices_pence: number; churn_rate: number; recent_transactions: any[] }>('/api/admin/billing/metrics'),

  // Forwarding Management
  forwardingQueue: (params: URLSearchParams) => legacyReq<{ items: any[]; total: number }>(`/api/admin/forwarding/queue?${params.toString()}`),
  fulfillForward: (id: string) => legacyReq(`/api/admin/forwarding/requests/${id}/fulfill`, { method: 'POST' }),
  cancelForward: (id: string) => legacyReq(`/api/admin/forwarding/requests/${id}/cancel`, { method: 'POST' }),

  // Analytics
  analytics: (range = '30d', period = 'rolling') => legacyReq(`/api/admin/analytics?range=${range}&period=${period}`),
};