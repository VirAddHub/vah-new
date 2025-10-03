"use client";

import { SWRConfig } from 'swr';

// Simple fetcher function defined inline to avoid serialization issues
async function fetcher(url: string) {
    const res = await fetch(url, {
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
                revalidateIfStale: true,
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                focusThrottleInterval: 15000,
                dedupingInterval: 1000,
                keepPreviousData: true,
                loadingTimeout: 3000,
            }}
        >
            {children}
        </SWRConfig>
    );
}
