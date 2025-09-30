// apps/frontend/lib/api.ts
import { getAuthHeader } from './token-manager';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
  "https://vah-api-staging.onrender.com";

/** Join base + path without double slashes */
function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** Low-level fetch helper – keeps headers sane with JWT support */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(buildUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(), // Include JWT token in Authorization header
      ...(init.headers || {}),
    },
  });
  return res;
}

/** JSON convenience helper (throws on !ok by default) */
export async function apiJson<T = any>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: any;
    init?: RequestInit;
    throwOnError?: boolean;
  } = {}
): Promise<T> {
  const { method = options.body ? "POST" : "GET", body, init, throwOnError = true } = options;
  const res = await apiFetch(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  if (throwOnError && !res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${path} -> ${res.status} ${res.statusText} ${text}`);
  }
  // try json; fall back to empty as any
  try { return (await res.json()) as T; } catch { return undefined as T; }
}

/** Backwards-compatible alias if some files still import legacy names */
export const API = (path: string) => buildUrl(path);
export const legacyReq = apiFetch;
export default apiFetch;

/** User profile functions */
export async function getMe() {
  return apiJson("/api/profile/me");
}

export async function patchMe(data: any) {
  return apiJson("/api/profile/me", { method: "PATCH", body: data });
}

/** Convenience function for POST requests with JSON body */
export async function postJson<T = any>(path: string, body: any): Promise<T> {
  return apiJson<T>(path, { method: "POST", body });
}
