// Key used for storing token in localStorage
const KEY = "vah_token";

export function setToken(token: string) {
  try { localStorage.setItem(KEY, token); } catch {}
}

export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearToken() {
  try { localStorage.removeItem(KEY); } catch {}
}

type JwtPayload = { id?: number; is_admin?: boolean; exp?: number };

/** Best-effort decode (no verify). Returns null if invalid. */
export function decodeToken(): JwtPayload | null {
  const t = getToken();
  if (!t) return null;
  try {
    const [, payload] = t.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  const p = decodeToken();
  if (!p) return false;
  if (!p.exp) return true;
  return Date.now() / 1000 < p.exp;
}

export function isAdmin(): boolean {
  const p = decodeToken();
  return !!p?.is_admin;
}
