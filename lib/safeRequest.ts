import { apiClient } from './api-client';

export type SafeResp<T> =
  | { ok: true; data: T }
  | { ok: false; data: null; status?: number; error?: string };

export async function safeGet<T = any>(url: string): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.get(url);
    if (!res.ok) return { ok: false, data: null, status: res.status, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: any) {
    return { ok: false, data: null, status: 500, error: error.message || 'Request failed' };
  }
}

export async function safePost<T = any>(url: string, data?: any): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.post(url, data);
    if (!res.ok) return { ok: false, data: null, status: res.status, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: any) {
    return { ok: false, data: null, status: 500, error: error.message || 'Request failed' };
  }
}

export async function safePut<T = any>(url: string, data?: any): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.put(url, data);
    if (!res.ok) return { ok: false, data: null, status: res.status, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: any) {
    return { ok: false, data: null, status: 500, error: error.message || 'Request failed' };
  }
}

export async function safeDelete<T = any>(url: string): Promise<SafeResp<T>> {
  try {
    const res = await apiClient.delete(url);
    if (!res.ok) return { ok: false, data: null, status: res.status, error: res.error };
    return { ok: true, data: res.data as T };
  } catch (error: any) {
    return { ok: false, data: null, status: 500, error: error.message || 'Request failed' };
  }
}
