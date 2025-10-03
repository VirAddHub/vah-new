// apps/frontend/lib/useAuthedSWR.ts
"use client";

import useSWR, { SWRConfiguration } from "swr";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vah-api-staging.onrender.com";

function makeFetcher(token?: string | null) {
  return async (path: string) => {
    if (!token) throw new Error("No token");
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "omit",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  };
}

/** Gate requests until token exists; minimal retries; revalidate on focus. */
export function useAuthedSWR<T = any>(key: string | null, config?: SWRConfiguration) {
  const { token } = useAuth();
  const fetcher = useMemo(() => makeFetcher(token), [token]);
  const gatedKey = token && key ? key : null;
  return useSWR<T>(gatedKey, fetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: (err: any) => !String(err?.message || "").startsWith("401"),
    ...config,
  });
}
