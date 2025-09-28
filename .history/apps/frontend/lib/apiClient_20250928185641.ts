import { API_BASE } from "./config";

export async function fetchJson<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init.headers || { accept: "application/json" });
  let body = init.body;

  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }

  const res = await fetch(url, { credentials: "include", ...init, headers, body });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    throw Object.assign(new Error("Request failed"), {
      status: res.status,
      payload: data,
    });
  }
  return data as T;
}

// Backward compatibility exports
export const apiClient = {
  async get(url: string) {
    return fetchJson(url, { method: 'GET' });
  },
  async post(url: string, data?: any) {
    return fetchJson(url, { method: 'POST', body: data });
  },
  async put(url: string, data?: any) {
    return fetchJson(url, { method: 'PUT', body: data });
  },
  async delete(url: string) {
    return fetchJson(url, { method: 'DELETE' });
  },
  async login(email: string, password: string) {
    return fetchJson('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },
  async whoami() {
    return fetchJson('/api/auth/whoami');
  },
  async signup(email: string, password: string, firstName?: string, lastName?: string) {
    return fetchJson('/api/auth/signup', {
      method: 'POST',
      body: { email, password, first_name: firstName, last_name: lastName }
    });
  }
};

export function safe<T>(v: any, fallback: T): T {
  return (v === null || v === undefined) ? fallback : v;
}

export const adminApi = {
  users: (params: URLSearchParams) => fetchJson(`/api/admin/users?${params.toString()}`),
  userStats: () => fetchJson('/api/admin/users/stats'),
  deleteUser: (id: string | number) => fetchJson(`/api/admin/users/${id}`, { method: 'DELETE' }),
  restoreUser: (id: string | number, body: any) => fetchJson(`/api/admin/users/${id}/restore`, {
    method: 'POST',
    body
  }),
  updateUser: (id: string, payload: any) => fetchJson(`/api/admin/users/${id}`, { 
    method: 'PUT', 
    body: payload 
  }),
  suspendUser: (id: string) => fetchJson(`/api/admin/users/${id}/suspend`, { method: 'PUT' }),
  activateUser: (id: string) => fetchJson(`/api/admin/users/${id}/activate`, { method: 'PUT' }),
  updateKyc: (id: string, status: string) => fetchJson(`/api/admin/users/${id}/kyc-status`, { 
    method: 'PUT', 
    body: { status } 
  }),
  mailItems: (params: URLSearchParams) => fetchJson(`/api/admin/mail-items?${params.toString()}`),
  updateMailItem: (id: string, payload: any) => fetchJson(`/api/admin/mail-items/${id}`, {
    method: 'PATCH',
    body: payload
  })
};
