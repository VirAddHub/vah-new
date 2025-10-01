// apps/frontend/lib/api.ts
import { API } from './api-base';
import { getToken } from './token-manager';
import { safeJson } from './http';

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = API(path);
  // temporary debug – remove after verification
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__VAH_LAST_REQ__ = { url, headers: Object.fromEntries(headers.entries()) };
    // console.debug('🌐 API ->', url, Object.fromEntries(headers.entries()));
  }

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  // Don't throw here; let callers read both json + status
  const data = await safeJson(res);
  return { res, data };
}

// Legacy compatibility exports
export async function apiFetch(path: string, init: RequestInit = {}) {
  const { res } = await api(path, init);
  return res;
}

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
  const { res, data } = await api(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  if (throwOnError && !res.ok) {
    const errorMsg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(`API ${method} ${path} -> ${res.status} ${res.statusText} ${errorMsg}`);
  }
  return data as T;
}

export async function postJson<T = any>(path: string, body: any): Promise<T> {
  return apiJson<T>(path, { method: "POST", body });
}

export async function getMe() {
  return apiJson("/api/profile/me");
}

export async function patchMe(data: any) {
  return apiJson("/api/profile/me", { method: "PATCH", body: data });
}

export default apiFetch;