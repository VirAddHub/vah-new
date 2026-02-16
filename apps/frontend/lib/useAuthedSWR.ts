"use client";

import useSWR, { type SWRConfiguration, type Key, type BareFetcher } from "swr";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

function resolveToken(ctx: ReturnType<typeof useAuth>): string | null {
  if (!ctx) return null;
  // support either `token` or `getToken()` in the context
  // (do not delete either path; keep both for compatibility)
  // @ts-ignore - tolerate older context types
  if (typeof ctx.getToken === "function") return ctx.getToken() ?? null;
  // @ts-ignore
  return ctx.token ?? null;
}

function makeFetcher(token?: string | null) {
  return async (keyOrTuple: string | readonly [string, Record<string, unknown>]) => {
    // Allow requests without token when using cookie-based auth
    // Token is optional - cookies will be sent via credentials: 'include'
    // if (!token) throw new Error("No token");

    // Handle both string keys and [url, params] tuples
    let url: string;
    if (typeof keyOrTuple === 'string') {
      url = keyOrTuple;
    } else if (Array.isArray(keyOrTuple)) {
      const [path, params] = keyOrTuple;
      const searchParams = new URLSearchParams();

      // Convert params object to URLSearchParams
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      url = searchParams.toString() ? `${path}?${searchParams.toString()}` : path;
    } else {
      throw new Error('Invalid key format');
    }

    // Use relative paths to go through BFF routes instead of direct backend calls
    // This ensures proper cookie forwarding, CSRF handling, and CORS compliance
    const fullUrl = url.startsWith('/') ? url : `/${url}`;
    console.log('[useAuthedSWR] Fetching:', fullUrl);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Only add Authorization header if token exists (for backward compatibility)
    // Cookie-based auth works without token via credentials: 'include'
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(fullUrl, {
      headers,
      credentials: 'include', // Include cookies for session (required for cookie-based auth)
    });

    const contentType = res.headers.get("content-type") || "";

    // If not JSON, read as text and throw a clearer error
    if (!contentType.toLowerCase().includes("application/json")) {
      const text = await res.text().catch(() => "");
      const snippet = text.slice(0, 200);
      console.error('[useAuthedSWR] Non-JSON response:', res.status, contentType, snippet);
      const error = new Error(
        `Upstream did not return JSON (status ${res.status}). Snippet: ${snippet}`
      );
      // @ts-ignore
      error.response = res;
      throw error;
    }

    let rawData: unknown;
    try {
      rawData = await res.json();
    } catch (err) {
      const text = await res.text().catch(() => "");
      const snippet = text.slice(0, 200);
      console.error('[useAuthedSWR] JSON parse error:', res.status, snippet);
      const error = new Error(
        `Failed to parse JSON (status ${res.status}). Snippet: ${snippet}`
      );
      // @ts-ignore
      error.response = res;
      throw error;
    }

    if (!res.ok) {
      console.error('[useAuthedSWR] Error:', res.status, res.statusText);
      const data = rawData as Record<string, unknown> | null | undefined;
      const error = new Error(String(data?.error ?? data?.message ?? `${res.status} ${res.statusText}`));
      // @ts-ignore
      error.response = res;
      // @ts-ignore
      error.data = rawData;
      throw error;
    }

    const raw = rawData as Record<string, unknown> | null | undefined;
    console.log('[useAuthedSWR] Raw response:', raw);

    // Handle wrapped response format: { ok, items, total } or { ok, data }
    let data: unknown = rawData;
    if (raw?.ok === true) {
      // If response has { ok: true, items, total } - use items/total directly
      if (raw.items !== undefined) {
        data = {
          items: raw.items,
          total: raw.total ?? raw.count ?? 0,
          page: raw.page,
          pageSize: raw.pageSize,
        };
      }
      // If response has { ok: true, data } - unwrap the data
      else if (raw.data !== undefined) {
        data = raw.data;
      }
    }

    console.log('[useAuthedSWR] Normalized response:', data);
    return data;
  };
}

/** Gate requests until token exists; revalidate on focus; don't retry 401s. */
export function useAuthedSWR<T = unknown>(
  key: string | readonly [string, Record<string, unknown>] | null,
  config?: SWRConfiguration
) {
  const auth = useAuth();
  const token = resolveToken(auth);
  const fetcher = useMemo(() => {
    const f = makeFetcher(token);
    const wrapped: BareFetcher<T> = (keyOrTuple) =>
      f(keyOrTuple as string | readonly [string, Record<string, unknown>]).then((data) => data as T);
    return wrapped;
  }, [token]);
  // Allow requests even without token (cookie-based auth)
  const gatedKey = key as Key;

  return useSWR<T>(gatedKey, fetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: (err: unknown) => !String((err as Error)?.message || "").startsWith("401"),
    ...config,
  });
}