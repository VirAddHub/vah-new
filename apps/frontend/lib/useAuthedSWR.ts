// apps/frontend/lib/useAuthedSWR.ts
"use client";

import useSWR, { SWRConfiguration } from "swr";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { tokenManager } from "@/lib/token-manager";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vah-api-staging.onrender.com";

function makeFetcher(token?: string | null) {
    return async (key: string | readonly [string, any]) => {
        if (!token) throw new Error("No token");

        // Handle both string keys and [url, params] tuple keys
        let url: string;
        if (typeof key === 'string') {
            url = `${API}${key}`;
        } else {
            const [path, params] = key;
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    searchParams.append(k, String(v));
                }
            });
            url = `${API}${path}?${searchParams.toString()}`;
        }

        console.log('useAuthedSWR: Making request to:', url);
        console.log('useAuthedSWR: Token exists:', !!token);

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "omit",
        });
        
        console.log('useAuthedSWR: Response status:', res.status);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('useAuthedSWR: API Error:', res.status, errorText);
            throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
        }
        
        const data = await res.json();
        console.log('useAuthedSWR: Response data:', data);
        return data;
    };
}

/** Gate requests until token exists; minimal retries; revalidate on focus. */
export function useAuthedSWR<T = any>(key: string | readonly [string, any] | null, config?: SWRConfiguration) {
    const { isAuthenticated } = useAuth();
    const token = tokenManager.get();
    const fetcher = useMemo(() => makeFetcher(token), [token]);
    const gatedKey = isAuthenticated && token && key ? key : null;

    console.log('useAuthedSWR: Hook called with:', {
        key,
        isAuthenticated,
        hasToken: !!token,
        gatedKey,
        willFetch: !!gatedKey
    });

    return useSWR<T>(gatedKey, fetcher, {
        revalidateOnFocus: true,
        shouldRetryOnError: (err: any) => !String(err?.message || "").startsWith("401"),
        ...config,
    });
}
