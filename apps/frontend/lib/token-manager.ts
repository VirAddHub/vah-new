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

// Authentication is now handled via httpOnly cookies
// These functions are kept for compatibility but are effectively no-ops
export function getToken(): string | null {
  return null;
}

export function setToken(token: string | null) {
  // No-op
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try {
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
    return null;
  },
  set(token: string) {
    // No-op
  },
  clear() {
    clearCSRFToken();
    window.dispatchEvent(new Event(EVT));
  },
  onChange(cb: () => void) {
    return () => { };
  },
};

// get user (uses safe JSON)
export function getStoredUser<T = unknown>(): T | null {
  return null;
}

// set user
export function setStoredUser(user: unknown | null): void {
  // No-op
}