// apps/frontend/lib/token-manager.ts
import { parseJSONSafe } from './parse-json-safe';

const KEY = 'vah_jwt';
const USER_KEY = 'vah_user';

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
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch { }
}

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