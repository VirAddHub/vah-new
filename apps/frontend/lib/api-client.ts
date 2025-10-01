// ---- Types ----------------------------------------------------

import { UnknownRecord } from './types';
import { setToken, clearToken, getToken } from './token-manager';

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; message: string; code?: string; status?: number };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

// Type guard function to safely check if response is successful
export function isOk<T>(r: ApiResponse<T> | unknown): r is ApiOk<T> {
    return !!r && typeof r === "object" && (r as UnknownRecord).ok === true;
}

// Match your backend fields (snake_case). Add/trim fields to match your app.
export interface User {
    id: string;                    // keep as string; backend often returns text ids
    email: string;
    name?: string;                 // display name
    first_name?: string | null;
    last_name?: string | null;
    is_admin?: boolean;            // backend uses is_admin
    role?: 'admin' | 'user';
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

// ---- Legacy API Client (for backward compatibility) ----

import { api } from './api';

// Simple fetch wrapper for legacy compatibility with JWT support
async function legacyReq<T = any>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
        const token = getToken();
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

        // Debug logging for API requests
        if (path.includes('/api/auth/')) {
            console.log('🌐 API DEBUG - Making request to:', path);
            console.log('🌐 API DEBUG - Auth header:', authHeader);
            console.log('🌐 API DEBUG - Full headers:', {
                'Content-Type': 'application/json',
                ...authHeader,
                ...init.headers,
            });
        }

        const { res, data } = await api(path, init);

        if (!res.ok) {
            // Handle 401 errors by clearing token and redirecting to login
            if (res.status === 401) {
                clearToken();
                // Redirect to login page if we're in the browser
                if (typeof window !== 'undefined') {
                    window.location.href = '/login?expired=1';
                }
            }
            const errorMsg = (data && (data.message || data.error)) || res.statusText;
            return { ok: false, message: errorMsg, status: res.status };
        }

        return { ok: true, data };
    } catch (error: any) {
        return { ok: false, message: error.message, status: 500 };
    }
}

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

    if (!id || !email) return null;

    return {
        id,
        email,
        name: u.name || `${first_name || ''} ${last_name || ''}`.trim() || undefined,
        first_name: first_name || null,
        last_name: last_name || null,
        is_admin: u.is_admin === true || u.role === 'admin',
        role: u.role || (u.is_admin ? 'admin' : 'user'),
        kyc_status: u.kyc_status || 'pending',
    };
}

// Coerce response to user format
function coerceUserResponse(resp: ApiResponse<any>): ApiResponse<{ user: User }> {
    if (!resp.ok) return resp;

    const user = normalizeUserPayload(resp.data);
    if (!user) {
        return { ok: false, message: 'Invalid user data received', status: 500 };
    }

    return { ok: true, data: { user } };
}

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

        // Enhanced debug logging for login response
        console.log('🔍 LOGIN DEBUG - Full response:', resp);
        console.log('🔍 LOGIN DEBUG - Response structure:', {
            ok: resp.ok,
            status: 'status' in resp ? resp.status : 'N/A',
            hasData: resp.ok && !!resp.data,
            hasToken: resp.ok && resp.data && resp.data.data && 'token' in resp.data.data,
            dataKeys: resp.ok && resp.data ? Object.keys(resp.data) : [],
            dataDataKeys: resp.ok && resp.data && resp.data.data ? Object.keys(resp.data.data) : [],
            fullData: resp.ok ? resp.data : null
        });

        // If login successful, store the JWT token
        if (resp.ok && resp.data && resp.data.data && 'token' in resp.data.data) {
            const token = resp.data.data.token as string;
            console.log('🔑 TOKEN DEBUG - Storing token:', token.substring(0, 50) + '...');
            setToken(token);
            console.log('✅ JWT token stored successfully in localStorage');

            // Verify token was stored
            const storedToken = getToken();
            console.log('🔍 TOKEN DEBUG - Verification - stored token exists:', !!storedToken);
            console.log('🔍 TOKEN DEBUG - Stored token matches:', storedToken === token);

            // Sanity check: verify token works with whoami
            try {
                console.log('🔍 WHOAMI DEBUG - Testing token with whoami endpoint...');
                const whoamiResp = await legacyReq('/api/auth/whoami', { method: 'GET' });
                console.log('🔍 WHOAMI DEBUG - Whoami response:', whoamiResp);
                if (!whoamiResp.ok) {
                    console.warn('⚠️ Login successful but whoami failed - token may be invalid');
                } else {
                    console.log('✅ Whoami check passed - token is valid and working');
                }
            } catch (error) {
                console.warn('⚠️ Login successful but whoami check failed:', error);
            }
        } else {
            console.error('❌ LOGIN FAILED - No token in response:', resp);
        }

        return coerceUserResponse(resp);
    },

    async whoami(): Promise<ApiResponse<{ user: User }>> {
        const resp = await legacyReq('/api/auth/whoami', { method: 'GET' });
        return coerceUserResponse(resp);
    },

    async logout(): Promise<ApiResponse<{ message: string }>> {
        const resp = await legacyReq('/api/auth/logout', { method: 'POST' });
        // Always clear the token on logout, regardless of API response
        clearToken();
        return resp;
    },

    async signup(
        email: string,
        password: string,
        first_name?: string,
        last_name?: string
    ): Promise<ApiResponse<{ user: User }>> {
        const resp = await legacyReq('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, first_name, last_name }),
        });
        return coerceUserResponse(resp);
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
};

// Export AuthAPI for components that need it
type WhoAmI = { user_id: string; email: string; role?: string; is_admin?: boolean; first_name?: string; last_name?: string };
type LoginOk = { ok: true; data: { token: string; user: WhoAmI } };
type Fail = { ok: false; message?: string; error?: string };

export const AuthAPI = {
  async login(email: string, password: string): Promise<LoginOk | Fail> {
    const { res, data } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok || !data?.ok) {
      const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
      return { ok: false, message: msg };
    }

    const token: string | undefined = data?.data?.token ?? data?.token;
    if (!token) return { ok: false, message: 'No token in response' };

    setToken(token);

    // Fetch user profile immediately so callers get user + token
    const who = await api('/api/auth/whoami', { method: 'GET' });
    if (!who.res.ok || !who.data?.ok) {
      const msg = (who.data && (who.data.message || who.data.error)) || `HTTP ${who.res.status}`;
      return { ok: false, message: msg || 'Failed to fetch user after login' };
    }

    const user = who.data.data as WhoAmI;

    return { ok: true, data: { token, user } };
  },

  async whoami(): Promise<{ ok: true; data: WhoAmI } | Fail> {
    const { res, data } = await api('/api/auth/whoami', { method: 'GET' });
    if (!res.ok || !data?.ok) {
      const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
      return { ok: false, message: msg || 'Auth failed' };
    }
    return { ok: true, data: data.data as WhoAmI };
  },

  async logout() {
    clearToken();
    return { ok: true } as const;
  },
};
