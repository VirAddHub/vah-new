// hooks/usePaged.ts
// Hook for paginated lists with automatic background refresh

import { useAuthedSWR } from '@/lib/useAuthedSWR';
import { SWRConfiguration } from 'swr';

export type PagedResponse<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export interface UsePagedOptions {
    /**
     * Refresh interval in milliseconds (background polling only)
     * @default 15000 (15 seconds)
     */
    refreshMs?: number;

    /**
     * Additional SWR configuration options
     */
    swrConfig?: SWRConfiguration;
}

/**
 * Hook for fetching paginated data with automatic background refresh
 *
 * KEY BEHAVIOR:
 * - Page/filter changes: fetch immediately (key changes)
 * - Background refresh: every `refreshMs` (default 15s)
 * - User actions: INSTANT fetch (not delayed by refreshMs)
 *
 * USE CASES:
 * - Non-search lists (inbox, activity, notifications)
 * - Lists with dropdown filters (not free-text search)
 *
 * DON'T USE FOR:
 * - Search with text input (use `useSearch` instead)
 *
 * @param key - SWR key (URL string or [url, params] tuple)
 * @param opts - Configuration options
 *
 * @example
 * ```tsx
 * const { items, total, isLoading, isValidating } = usePaged<MailItem>(
 *   `/api/mail-items?page=${page}&pageSize=20`,
 *   { refreshMs: 15000 }
 * );
 * ```
 */
export function usePaged<T>(
    key: string | readonly [string, any] | null,
    opts?: UsePagedOptions
) {
    const { refreshMs = 15000, swrConfig = {} } = opts || {};

    const swr = useAuthedSWR<PagedResponse<T>>(key, {
        keepPreviousData: true,          // Keep old data while fetching (no flash)
        refreshInterval: refreshMs,      // Background polling interval
        refreshWhenHidden: false,        // Don't poll when tab is hidden
        refreshWhenOffline: false,       // Don't poll when offline
        revalidateOnFocus: true,         // Fetch when tab regains focus
        ...swrConfig,
    });

    return {
        ...swr,
        items: swr.data?.items ?? [],
        total: swr.data?.total ?? 0,
        page: swr.data?.page ?? 1,
        pageSize: swr.data?.pageSize ?? 20,
    };
}
