// hooks/useInfinite.ts
// Hook for infinite scroll lists with automatic background refresh

import useSWRInfinite, { SWRInfiniteConfiguration } from 'swr/infinite';

export type InfiniteResponse<T> = {
    items: T[];
    nextCursor?: string;
};

export interface UseInfiniteOptions {
    /**
     * Refresh interval in milliseconds
     * @default 20000 (20 seconds)
     */
    refreshMs?: number;

    /**
     * Additional SWR infinite configuration options
     */
    swrConfig?: SWRInfiniteConfiguration;
}

/**
 * Hook for fetching infinite scroll data with automatic background refresh
 *
 * @param getKey - Function that returns the SWR key for each page
 * @param opts - Configuration options
 *
 * @example
 * ```tsx
 * const { items, hasMore, size, setSize, isLoading } = useInfinite<Activity>(
 *   (index, prev) => {
 *     if (index === 0) return '/api/activity?limit=20';
 *     if (!prev?.nextCursor) return null;
 *     return `/api/activity?cursor=${prev.nextCursor}&limit=20`;
 *   },
 *   { refreshMs: 20000 }
 * );
 * ```
 */
export function useInfinite<T>(
    getKey: (
        index: number,
        previousPageData: InfiniteResponse<T> | null
    ) => string | readonly [string, any] | null,
    opts?: UseInfiniteOptions
) {
    const { refreshMs = 20000, swrConfig = {} } = opts || {};

    const swr = useSWRInfinite<InfiniteResponse<T>>(getKey, {
        parallel: true,
        refreshInterval: refreshMs, // Only refreshes first page
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        revalidateFirstPage: true,
        revalidateOnFocus: true,
        ...swrConfig,
    });

    const pages = swr.data ?? [];
    const items = pages.flatMap((page) => page.items);
    const hasMore = !!pages.at(-1)?.nextCursor;

    return {
        ...swr,
        items,
        hasMore,
        /**
         * Load next page
         */
        loadMore: () => swr.setSize(swr.size + 1),
    };
}
