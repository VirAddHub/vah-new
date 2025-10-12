"use client";

import { SWRConfig } from 'swr';
import { cachedFetch } from '@/lib/cachedFetch';

// Simple fetcher function defined inline to avoid serialization issues
async function fetcher(url: string) {
    const res = await cachedFetch(url, {
        headers: {
            accept: 'application/json',
        },
        credentials: 'include',
    });

    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        // @ts-ignore
        error.info = await res.json().catch(() => ({}));
        // @ts-ignore
        error.status = res.status;
        throw error;
    }

    return res.json();
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
