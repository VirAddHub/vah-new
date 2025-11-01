/**
 * @deprecated This API client is deprecated. Use `import api from "@/lib/http"` instead.
 * 
 * The unified client (`@/lib/http`) automatically uses BFF endpoints and cookie-based auth.
 * You no longer need a separate "direct" client.
 * 
 * Migration guide:
 * - Replace `import { apiDirect } from "@/lib/apiDirect"` with `import api from "@/lib/http"`
 * - Replace `apiDirect()` calls with `api.get()`, `api.post()`, etc.
 * 
 * This file will be removed after all usages are migrated.
 */
// apps/frontend/lib/apiDirect.ts
// Direct backend API client - no accidental BFF usage for writes

// Dev-only deprecation warning
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const warnOnce = () => {
    if (!(window as any).__apiDirectDeprecationWarned) {
      console.warn(
        '[DEPRECATED] "@/lib/apiDirect" is deprecated. Use "@/lib/http" instead. ' +
        'See migration guide in lib/apiDirect.ts'
      );
      (window as any).__apiDirectDeprecationWarned = true;
    }
  };
  setTimeout(warnOnce, 0);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

const getToken = () => {
  try {
    return localStorage.getItem("vah_jwt");
  } catch {
    return null;
  }
};

export interface ApiDirectOptions extends RequestInit {
  json?: any;
}

export async function apiDirect(path: string, init: ApiDirectOptions = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const body = init.json !== undefined ? JSON.stringify(init.json) : init.body;

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${API_BASE}${normalizedPath}`, {
    ...init,
    headers,
    body,
    credentials: "include" // Keep cookies for session management
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[apiDirect] ${init.method || 'GET'} ${normalizedPath} failed:`, {
      status: res.status,
      statusText: res.statusText,
      data
    });
    throw new Error(data?.message || `${res.status} ${res.statusText}`);
  }

  console.log(`[apiDirect] ${init.method || 'GET'} ${normalizedPath} success:`, data);
  return data;
}

// Convenience methods for common operations
export const apiDirectClient = {
  // Forwarding operations
  async updateForwardingStatus(id: number, action: string, extraData?: any) {
    return apiDirect(`/api/admin/forwarding/requests/${id}`, {
      method: 'PATCH',
      json: { action, ...extraData }
    });
  },

  // Profile operations
  async updateProfile(data: any) {
    return apiDirect('/api/profile/me', {
      method: 'PATCH',
      json: data
    });
  },

  // Billing operations
  async changePlan(planId: number) {
    return apiDirect('/api/billing/change-plan', {
      method: 'POST',
      json: { plan_id: planId }
    });
  },

  async reauthorisePayment() {
    return apiDirect('/api/billing/reauthorise', {
      method: 'POST'
    });
  },

  // Forwarding requests
  async createForwardingRequest(mailItemId: number, method: string, reason: string) {
    return apiDirect('/api/forwarding/requests', {
      method: 'POST',
      json: {
        mail_item_id: mailItemId,
        method,
        reason
      }
    });
  }
};
