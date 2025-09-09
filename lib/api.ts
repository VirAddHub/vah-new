export type Json = Record<string, any>;

// Use the new environment variable name
const BASE = process.env.NEXT_PUBLIC_API_ORIGIN!;

function headers() {
  return { "Content-Type": "application/json", Accept: "application/json" };
}

async function handle<T>(res: Response, pathForError?: string): Promise<T> {
  if (!res.ok) {
    let detail: any = null;
    try { detail = await res.json(); } catch { }
    const msg = detail?.message || detail?.error || res.statusText || "Request failed";
    throw new Error(`[${res.status}] ${pathForError || ""} ${msg}`.trim());
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// New simplified fetch helpers as requested
export async function apiGet<T>(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, data: unknown, headers: Record<string,string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function getCsrfToken() {
  const res = await fetch(`${BASE}/api/csrf`, { credentials: 'include' });
  const { csrfToken } = await res.json();
  return csrfToken as string;
}

// One-liner for CSRF-protected POSTs
export async function apiPostCSRF<T>(path: string, data: unknown) {
  const token = await getCsrfToken();
  return apiPost<T>(path, data, { 'X-CSRF-Token': token });
}

// Keep the existing api object for backward compatibility
export const api = {
  get: async <T = any>(path: string) =>
    handle<T>(await fetch(`${BASE}${path}`, { headers: headers(), credentials: "include" }), path),
  post: async <T = any>(path: string, data: Json) =>
    handle<T>(await fetch(`${BASE}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(data), credentials: "include" }), path),
  put: async <T = any>(path: string, data: Json) =>
    handle<T>(await fetch(`${BASE}${path}`, { method: "PUT", headers: headers(), body: JSON.stringify(data), credentials: "include" }), path),
  del: async <T = any>(path: string) =>
    handle<T>(await fetch(`${BASE}${path}`, { method: "DELETE", headers: headers(), credentials: "include" }), path),
};
