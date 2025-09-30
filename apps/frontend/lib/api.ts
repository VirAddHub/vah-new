// apps/frontend/lib/api.ts
/**
 * Centralized API client for calling the backend (Render).
 * Requires NEXT_PUBLIC_BACKEND_API_ORIGIN to be defined at build time.
 *
 * Example:
 *   NEXT_PUBLIC_BACKEND_API_ORIGIN=https://vah-api-staging.onrender.com
 */

const RAW = process.env.NEXT_PUBLIC_BACKEND_API_ORIGIN;

// Always use relative URLs for password reset to go through bulletproof Next.js routes
// This ensures we never get 500s from Vercel proxy issues
const API_BASE = ""; // Force relative URLs

type Json = Record<string, unknown> | unknown[];

async function handle(res: Response) {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text || null };
  }
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    if (data && typeof data === "object" && "message" in data) {
      const messageStr = String((data as any).message);
      if (messageStr) {
        msg = messageStr;
      }
    }
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data;
}

function buildUrl(base: string, path: string): string {
  if (!base) return path; // relative URL
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export async function getJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    ...init,
    headers: {
      ...(init.headers || {}),
      Accept: "application/json",
    },
  });
  return (await handle(res)) as T;
}

export async function postJson<T = any>(path: string, body?: Json, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  return (await handle(res)) as T;
}

// ---------- Specific API endpoints ----------

export const getMe = () =>
  getJson<{ ok: boolean; data: { user: any } }>("/api/me");

export const patchMe = (body: any) =>
  postJson<{ ok: boolean; data: { user: any } }>("/api/me/profile", body, { method: "PATCH" });

export const getPlans = () =>
  getJson<{ ok: boolean; data: any[] }>("/api/plans");