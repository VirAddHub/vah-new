// ---- Types ----------------------------------------------------

import { UnknownRecord } from './types';

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

// Simple fetch wrapper for legacy compatibility
async function legacyReq<T = any>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const url = path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${path}`;
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
      ...init,
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return { ok: false, message: data.message || res.statusText, status: res.status };
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
    return coerceUserResponse(resp);
  },

  async whoami(): Promise<ApiResponse<{ user: User }>> {
    const resp = await legacyReq('/api/auth/whoami', { method: 'GET' });
    return coerceUserResponse(resp);
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
};
