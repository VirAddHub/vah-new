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
  return async (path: string) => {
    if (!token) throw new Error("No token");
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      // keep credentials out unless you use cookies; header is enough
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
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