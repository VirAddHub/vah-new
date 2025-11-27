"use client";

import { SWRConfig } from 'swr';
import { cachedFetch } from '@/lib/cachedFetch';

// Simple fetcher function defined inline to avoid serialization issues
// Checks content-type before parsing to avoid "Unexpected token" errors
async function fetcher(url: string) {
    const res = await cachedFetch(url, {
        headers: {
            accept: 'application/json',
        },
        credentials: 'include',
    });

    const contentType = res.headers.get("content-type") || "";

    // If not JSON, read as text and throw a clearer error
    if (!contentType.toLowerCase().includes("application/json")) {
        const text = await res.text().catch(() => "");
        const snippet = text.slice(0, 200);
        const error = new Error(
            `Upstream did not return JSON (status ${res.status}). Snippet: ${snippet}`
        );
        // @ts-ignore
        error.response = res;
        // @ts-ignore
        error.status = res.status;
        throw error;
    }

    let data: any;
    try {
        data = await res.json();
    } catch (err) {
        const text = await res.text().catch(() => "");
        const snippet = text.slice(0, 200);
        const error = new Error(
            `Failed to parse JSON (status ${res.status}). Snippet: ${snippet}`
        );
        // @ts-ignore
        error.response = res;
        // @ts-ignore
        error.status = res.status;
        throw error;
    }

    if (!res.ok) {
        const error = new Error(data?.error ?? data?.message ?? 'An error occurred while fetching the data.');
        // @ts-ignore
        error.info = data;
        // @ts-ignore
        error.status = res.status;
        throw error;
    }

    return data;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig
            value={{
                fetcher,
                revalidateIfStale: false,        // Reduce unnecessary revalidation
                revalidateOnFocus: false,         // Only for critical data
                revalidateOnReconnect: true,      // Reconnect when back online
                refreshInterval: 0,              // Disable automatic refresh
                dedupingInterval: 2000,          // Reduce from 10s to 2s
                keepPreviousData: true,          // Keep old data while fetching
                errorRetryCount: 2,              // Reduce retry attempts
                errorRetryInterval: 5000,        // Increase retry interval
                provider: () => new Map(),       // Avoid cross-request bleed
                focusThrottleInterval: 5000,     // Throttle focus revalidation
            }}
        >
            {children}
        </SWRConfig>
    );
}
