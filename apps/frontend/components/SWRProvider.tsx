"use client";

import { SWRConfig } from 'swr';
import { flexFetcher } from '@/lib/swr';
import { autoRefresh } from '@/lib/swrAutoRefresh';

export function SWRProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig
            value={{
                fetcher: flexFetcher,
                revalidateIfStale: true,
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                focusThrottleInterval: 15000,
                dedupingInterval: 1000,
                keepPreviousData: true,
                loadingTimeout: 3000,
                use: [
                    autoRefresh({ prefix: '/api/mail-items', intervalMs: 15000 }),
                    autoRefresh({ prefix: '/api/billing', intervalMs: 20000 }),
                    autoRefresh({ prefix: '/api/admin', intervalMs: 20000 }),
                ],
            }}
        >
            {children}
        </SWRConfig>
    );
}
