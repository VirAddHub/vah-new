// lib/swrAutoRefresh.ts
'use client';
// SWR middleware for automatic refresh based on API prefix

import type { Middleware } from 'swr';

export interface AutoRefreshConfig {
    /**
     * API prefix to match (e.g., '/api/mail-items')
     */
    prefix: string;

    /**
     * Refresh interval in milliseconds
     */
    intervalMs: number;
}

/**
 * SWR middleware that automatically applies refresh interval
 * to all requests matching a specific prefix
 *
 * @example
 * ```tsx
 * <SWRConfig value={{
 *   use: [
 *     autoRefresh({ prefix: '/api/mail-items', intervalMs: 15000 }),
 *     autoRefresh({ prefix: '/api/admin', intervalMs: 20000 }),
 *   ]
 * }}>
 *   {children}
 * </SWRConfig>
 * ```
 */
export const autoRefresh =
    ({ prefix, intervalMs }: AutoRefreshConfig): Middleware =>
        (useSWRNext) =>
            (key, fetcher, config) => {
                // Extract string from key (handle both string and [url, params] formats)
                const keyStr = Array.isArray(key) ? key[0] : key;
                const matches = typeof keyStr === 'string' && keyStr.startsWith(prefix);

                // Apply refresh config if prefix matches
                const enhancedConfig = matches
                    ? {
                        ...config,
                        refreshInterval: intervalMs,
                        refreshWhenHidden: false,
                        refreshWhenOffline: false,
                    }
                    : config;

                return useSWRNext(key, fetcher, enhancedConfig);
            };
