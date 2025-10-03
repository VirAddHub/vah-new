"use client";

import useSWR, { SWRConfiguration } from "swr";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vah-api-staging.onrender.com";

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
  return async (keyOrTuple: string | readonly [string, any]) => {
    if (!token) throw new Error("No token");

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

    console.log('[useAuthedSWR] Fetching:', `${API}${url}`);
    const res = await fetch(`${API}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include', // Include cookies for session
    });
    if (!res.ok) {
      console.error('[useAuthedSWR] Error:', res.status, res.statusText);
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const rawData = await res.json();
    console.log('[useAuthedSWR] Raw response:', rawData);

    // Handle wrapped response format: { ok, items, total } or { ok, data }
    let data = rawData;
    if (rawData?.ok === true) {
      // If response has { ok: true, items, total } - use items/total directly
      if (rawData.items !== undefined) {
        data = {
          items: rawData.items,
          total: rawData.total ?? rawData.count ?? 0,
          page: rawData.page,
          pageSize: rawData.pageSize,
        };
      }
      // If response has { ok: true, data } - unwrap the data
      else if (rawData.data !== undefined) {
        data = rawData.data;
      }
    }

    console.log('[useAuthedSWR] Normalized response:', data);
    return data;
  };
}

/** Gate requests until token exists; revalidate on focus; don't retry 401s. */
export function useAuthedSWR<T = any>(
  key: string | readonly [string, any] | null,
  config?: SWRConfiguration
) {
  const auth = useAuth();
  const token = resolveToken(auth);
  const fetcher = useMemo(() => makeFetcher(token), [token]);
  const gatedKey = token && key ? key : null;

  return useSWR<T>(gatedKey, fetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: (err: any) => !String(err?.message || "").startsWith("401"),
    ...config,
  });
}