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
  },
  async getAdminTransactions(params: any) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const data = await fetchJson(`/api/admin/transactions?${queryString}`);
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async getBilling() {
    try {
      const data = await fetchJson('/api/billing');
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async getInvoices() {
    try {
      const data = await fetchJson('/api/billing/invoices');
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async getSubscriptionStatus() {
    try {
      const data = await fetchJson('/api/billing/subscription');
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async createRedirectFlow() {
    try {
      const data = await fetchJson('/api/billing/create-redirect-flow', {
        method: 'POST'
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
  async users(params: URLSearchParams) {
    try {
      const data = await fetchJson(`/api/admin/users?${params.toString()}`);
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async userStats() {
    try {
      const data = await fetchJson('/api/admin/users/stats');
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async analytics(timeRange: string) {
    try {
      const data = await fetchJson(`/api/admin/analytics?timeRange=${timeRange}`);
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async billingMetrics() {
    try {
      const data = await fetchJson('/api/admin/billing/metrics');
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async deleteUser(id: string | number) {
    try {
      const data = await fetchJson(`/api/admin/users/${id}`, { method: 'DELETE' });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async restoreUser(id: string | number, body: any) {
    try {
      const data = await fetchJson(`/api/admin/users/${id}/restore`, {
        method: 'POST',
        body
      });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async updateUser(id: string, payload: any) {
    try {
      const data = await fetchJson(`/api/admin/users/${id}`, { 
        method: 'PUT', 
        body: payload 
      });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async suspendUser(id: string) {
    try {
      const data = await fetchJson(`/api/admin/users/${id}/suspend`, { method: 'PUT' });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async activateUser(id: string) {
    try {
      const data = await fetchJson(`/api/admin/users/${id}/activate`, { method: 'PUT' });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async updateKyc(id: string, status: string) {
    try {
      const data = await fetchJson(`/api/admin/users/${id}/kyc-status`, { 
        method: 'PUT', 
        body: { status } 
      });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async mailItems(params: URLSearchParams) {
    try {
      const data = await fetchJson(`/api/admin/mail-items?${params.toString()}`);
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async updateMailItem(id: string, payload: any) {
    try {
      const data = await fetchJson(`/api/admin/mail-items/${id}`, {
        method: 'PATCH',
        body: payload
      });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async forwardingQueue(params: URLSearchParams) {
    try {
      const data = await fetchJson(`/api/admin/forwarding/queue?${params.toString()}`);
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  },
  async cancelForward(requestId: string) {
    try {
      const data = await fetchJson(`/api/admin/forwarding-requests/${requestId}/cancel`, {
        method: 'PUT'
      });
      return { ok: true, data };
    } catch (error: any) {
      return { ok: false, message: error.message, status: error.status };
    }
  }
};
