// apps/frontend/lib/token-manager.ts
import { parseJSONSafe } from './parse-json-safe';

const KEY = 'vah_jwt';
const USER_KEY = 'vah_user';
const EVT = 'vah_jwt_change';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (!token) {
    try { window.localStorage.removeItem(KEY); } catch { }
  } else {
    try { window.localStorage.setItem(KEY, token); } catch { }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVT));
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch { }
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
    window.dispatchEvent(new Event(EVT));
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVT));
  },
  onChange(cb: () => void) {
    if (typeof window === 'undefined') return () => {};
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
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { }
  }
}