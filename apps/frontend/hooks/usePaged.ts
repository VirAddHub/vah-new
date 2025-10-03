// hooks/usePaged.ts
// Hook for paginated lists with automatic background refresh

import useSWR, { SWRConfiguration } from 'swr';

export type PagedResponse<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export interface UsePagedOptions {
    /**
     * Refresh interval in milliseconds
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
 * @param key - SWR key (URL string or [url, params] tuple)
 * @param opts - Configuration options
 *
 * @example
 * ```tsx
 * const { items, total, isLoading, error } = usePaged<MailItem>(
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

    const swr = useSWR<PagedResponse<T>>(key, {
        refreshInterval: refreshMs,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        keepPreviousData: true,
        revalidateOnFocus: true,
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
