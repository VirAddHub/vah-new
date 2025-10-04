import { apiClient } from './apiClient';

export type SafeResp<T> =
  | { ok: true; data: T }
  | { ok: false; data: null; status?: number; error?: string };

export async function safeGet<T = unknown>(url: string): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.get(url);
    if (!res.ok) return { ok: false, data: null, status: res.code, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Request failed';
    return { ok: false, data: null, status: 500, error: errorMessage };
  }
}

export async function safePost<T = unknown>(url: string, data?: unknown): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.post(url, data);
    if (!res.ok) return { ok: false, data: null, status: res.code, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Request failed';
    return { ok: false, data: null, status: 500, error: errorMessage };
  }
}

export async function safePut<T = unknown>(url: string, data?: unknown): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.put(url, data);
    if (!res.ok) return { ok: false, data: null, status: res.code, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Request failed';
    return { ok: false, data: null, status: 500, error: errorMessage };
  }
}

export async function safeDelete<T = unknown>(url: string): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.delete(url);
    if (!res.ok) return { ok: false, data: null, status: res.code, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Request failed';
    return { ok: false, data: null, status: 500, error: errorMessage };
  }
}
