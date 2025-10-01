// ---- Types ----------------------------------------------------

import { UnknownRecord } from './types';
import { setToken, clearToken, getToken } from './token-manager';
import { setStoredUser } from './session';
import { addCSRFHeader } from './csrf-protection';

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; message: string; code?: string; status?: number };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

// Type guard function to safely check if response is successful
export function isOk<T>(r: ApiResponse<T> | unknown): r is ApiOk<T> {
    return !!r && typeof r === "object" && (r as UnknownRecord).ok === true;
}

// User interface is now imported from ../types/user

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
        id: id,
        email,
        name: u.name || null,
        is_admin: u.is_admin === true || u.role === 'admin',
        role: u.role || (u.is_admin ? 'admin' : 'user'),
        kyc_status: u.kyc_status || null,
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
        const resp = await legacyReq(apiUrl('auth/login'), {
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
        // Backend returns: { ok: true, data: { user: {...}, token: "..." } }
        if (resp.ok && resp.data && 'token' in resp.data) {
            const token = resp.data.token as string;
            console.log('🔑 TOKEN DEBUG - Storing token:', token.substring(0, 50) + '...');
            setToken(token);
            console.log('✅ JWT token stored successfully in localStorage');

            // Also store user data if present
            if (resp.data.user) {
                setStoredUser(resp.data.user);
                console.log('✅ User data stored:', resp.data.user);
            }

            // Verify token was stored
            const storedToken = getToken();
            console.log('🔍 TOKEN DEBUG - Verification - stored token exists:', !!storedToken);
            console.log('🔍 TOKEN DEBUG - Stored token matches:', storedToken === token);

            // Sanity check: verify token works with whoami
            try {
                console.log('🔍 WHOAMI DEBUG - Testing token with whoami endpoint...');
                const whoamiResp = await authFetch('auth/whoami', { method: 'GET' });
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

        // Backend returns { ok: true, data: { user: {...}, token: "..." } }
        // We need to return { ok: true, data: { user: {...} } } for the frontend
        if (resp.ok && resp.data && resp.data.user) {
            return { ok: true, data: { user: resp.data.user } };
        }

        return coerceUserResponse(resp);
    },

    async whoami(): Promise<ApiResponse<{ user: User }>> {
        const resp = await authFetch('auth/whoami', { method: 'GET' });
        const data = await parseResponseSafe(resp);

        // Backend returns: { ok: true, data: { user_id, email, is_admin, role } }
        // Convert to frontend format: { ok: true, data: { user: { id, email, ... } } }
        if (resp.ok && data && data.data) {
            const userData = data.data;
            return {
                ok: true,
                data: {
                    user: {
                        id: userData.user_id,
                        email: userData.email,
                        is_admin: userData.is_admin,
                        role: userData.role
                    }
                }
            };
        }

        return coerceUserResponse({ ok: resp.ok, data, status: resp.status } as ApiResponse<any>);
    },

    async logout(): Promise<ApiResponse<{ message: string }>> {
        const resp = await authFetch('auth/logout', { method: 'POST' });
        const data = await parseResponseSafe(resp);
        // Always clear the token on logout, regardless of API response
        clearToken();
        return { ok: resp.ok, data, status: resp.status } as ApiResponse<{ message: string }>;
    },

    async signup(
        email: string,
        password: string,
        first_name?: string,
        last_name?: string
    ): Promise<ApiResponse<{ user: User }>> {
        const resp = await legacyReq(apiUrl('auth/signup'), {
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
import type { Role } from '../types/user';
import type { User } from './client-auth';
import { apiUrl } from './api-url';
import { tokenManager } from './token-manager';
export type { User } from './client-auth';

// Auth-aware fetch wrapper
async function authFetch(inputPath: string, init: RequestInit = {}) {
    const url = apiUrl(inputPath);
    const token = tokenManager.get();

    // Don't call whoami when there's no token
    if (!token && inputPath === 'auth/whoami') {
        return new Response(JSON.stringify({ ok: false, error: 'no_token' }), { status: 401 }) as any;
    }

    const headers = new Headers(init.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    // Keep existing Content-Type if caller set it
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Add CSRF protection for state-changing requests
    if (init.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method.toUpperCase())) {
        const csrfHeaders = addCSRFHeader();
        Object.entries(csrfHeaders).forEach(([key, value]) => {
            headers.set(key, value as string);
        });
    }
    const res = await fetch(url, { ...init, headers, credentials: 'include' });
    // optional: clear token on 401 to avoid loops
    if (res.status === 401) tokenManager.clear();
    return res;
}

// Safe response parser to avoid "undefined is not valid JSON" crashes
async function parseResponseSafe(res: Response): Promise<any> {
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!text.trim()) return null;
    if (ct.includes('application/json')) {
        try { return JSON.parse(text); } catch { return null; }
    }
    // Non-JSON payloads: return raw text
    return text;
}

// Normalize backend payload to our strict User type
function normalizeUser(input: any): User {
    const rawRole = typeof input?.role === 'string' ? input.role.toLowerCase() : undefined;
    const role: Role = rawRole === 'admin' ? 'admin' : 'user';

    return {
        id: String(input?.user_id ?? input?.id ?? ''),
        email: String(input?.email ?? ''),
        name: input?.name ? String(input.name) : undefined,
        role,
        is_admin: Boolean(input?.is_admin),
        kyc_status: input?.kyc_status ? String(input.kyc_status) : undefined,
    };
}

// REVISED: The API now returns a nested user object, so we adjust the type.
type LoginOk = { ok: true; data: { token: string; user: User } };
type Fail = { ok: false; message?: string; error?: string };

export const AuthAPI = {
    async login(email: string, password: string): Promise<LoginOk | Fail> {
        const { res, data } = await api(apiUrl('auth/login'), {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok || !data?.ok) {
            return { ok: false, message: data?.message || data?.error || `HTTP ${res.status}` };
        }

        const token = data?.data?.token;
        const rawUser = data?.data?.user;

        if (!token || !rawUser) {
            return { ok: false, message: 'Invalid response from server' };
        }

        setToken(token);
        tokenManager.set(token);
        console.debug('[auth] token stored');

        // REVISED: Normalize the user object directly from the login response.
        // REMOVED: The unnecessary and slow `whoami` call.
        const user = normalizeUser(rawUser);

        return { ok: true, data: { token, user } };
    },

    async whoami(): Promise<{ ok: true; data: User } | Fail> {
        const res = await authFetch('auth/whoami', { method: 'GET' });
        const data = await parseResponseSafe(res);
        if (!res.ok || !data?.ok) {
            return { ok: false, message: data?.message || data?.error || `Auth failed (${res.status})` };
        }
        return { ok: true, data: normalizeUser(data.data) };
    },

    async logout() {
        clearToken();
        return { ok: true } as const;
    },
};
