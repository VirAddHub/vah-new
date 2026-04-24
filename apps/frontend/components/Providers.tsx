'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { AuthProvider } from '@/contexts/AuthContext';

import { AdminHeartbeatProvider } from '@/contexts/AdminHeartbeatContext';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
                revalidateIfStale: false,
                dedupingInterval: 3000,
                shouldRetryOnError: false,
                provider: () => new Map(),
            }}
        >
            <AuthProvider>
                <AdminHeartbeatProvider>
                    {children}
                </AdminHeartbeatProvider>
            </AuthProvider>
        </SWRConfig>
    );
}
