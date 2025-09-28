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
