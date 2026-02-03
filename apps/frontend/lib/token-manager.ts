// apps/frontend/lib/token-manager.ts
import { parseJSONSafe } from './parse-json-safe';
import { clearCSRFToken } from './csrf-protection';

const KEY = 'vah_jwt';
const USER_KEY = 'vah_user';
const EVT = 'vah_jwt_change';

// Safe JSON helpers without changing existing exports
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function safeStringify(value: unknown): string {
  try { return JSON.stringify(value); } catch { return 'null'; }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (!token) {
    try {
      window.localStorage.removeItem(KEY);
      // Also clear the cookie for middleware to ensure consistent state
      document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch { }
  } else {
    try {
      window.localStorage.setItem(KEY, token);
      // Also set cookie for middleware to access with CSRF protection
      // This supports the dual-auth strategy (Phase A)
      document.cookie = `vah_jwt=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; HttpOnly=false; Secure=${location.protocol === 'https:'}`;
    } catch { }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVT));
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
    // Also clear the cookie for middleware
    document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    // Clear CSRF token as well
    clearCSRFToken();
  } catch { }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVT));
  }
}

// Simple JWT manager with change events
export const tokenManager = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEY);
  },
  set(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY, token);
    document.cookie = `vah_jwt=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; HttpOnly=false; Secure=${location.protocol === 'https:'}`;
    window.dispatchEvent(new Event(EVT));
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEY);
    document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    clearCSRFToken();
    window.dispatchEvent(new Event(EVT));
  },
  onChange(cb: () => void) {
    if (typeof window === 'undefined') return () => { };
    const handler = () => cb();
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  },
};

// get user (uses safe JSON)
export function getStoredUser<T = any>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return parseJSONSafe<T | null>(raw, null);
}

// set user
export function setStoredUser(user: any | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    try { localStorage.removeItem(USER_KEY); } catch { }
  } else {
    try { localStorage.setItem(USER_KEY, safeStringify(user)); } catch { }
  }
}