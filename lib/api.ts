export type Json = Record<string, any>;
const BASE = process.env.NEXT_PUBLIC_API_BASE!;
function headers() {
  return { "Content-Type": "application/json", Accept: "application/json" };
}
async function handle<T>(res: Response, pathForError?: string): Promise<T> {
  if (!res.ok) {
    let detail: any = null;
    try { detail = await res.json(); } catch {}
    const msg = detail?.message || detail?.error || res.statusText || "Request failed";
    throw new Error(`[${res.status}] ${pathForError || ""} ${msg}`.trim());
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
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
