// hooks/useSearch.ts
// Hook for debounced search with automatic background refresh

import useSWR, { SWRConfiguration } from 'swr';
import { useDebouncedValue } from './useDebouncedValue';

export type SearchResponse<T> = {
    items: T[];
    total: number;
    query: string;
};

export interface UseSearchOptions {
    /**
     * Debounce delay in milliseconds
     * @default 300
     */
    debounceMs?: number;

    /**
     * Refresh interval in milliseconds
     * @default 30000 (30 seconds)
     */
    refreshMs?: number;

    /**
     * Additional SWR configuration options
     */
    swrConfig?: SWRConfiguration;
}

/**
 * Hook for debounced search with automatic background refresh
 * Returns null key (no fetch) if query is empty after debouncing
 *
 * @param rawQuery - The raw search query (will be debounced)
 * @param page - Current page number
 * @param pageSize - Items per page
 * @param opts - Configuration options
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const { data, isLoading, isValidating } = useSearch<MailItem>(
 *   query,
 *   1,
 *   20,
 *   { debounceMs: 300, refreshMs: 30000 }
 * );
 * ```
 */
export function useSearch<T>(
    rawQuery: string,
    page = 1,
    pageSize = 20,
    opts?: UseSearchOptions
) {
    const {
        debounceMs = 300,
        refreshMs = 30000,
        swrConfig = {},
    } = opts || {};

    // Debounce the query to avoid excessive API calls
    const query = useDebouncedValue(rawQuery.trim(), debounceMs);

    // Only fetch if there's a query
    const key = query
        ? (['/api/search', { q: query, page, pageSize }] as const)
        : null;

    const swr = useSWR<SearchResponse<T>>(key, {
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
        query: query,
        isSearching: !!query,
    };
}
