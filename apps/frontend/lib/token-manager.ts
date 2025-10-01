// apps/frontend/lib/token-manager.ts
const KEY = 'vah_jwt';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(KEY); } catch { return null; }
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, token); } catch {}
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch {}
}