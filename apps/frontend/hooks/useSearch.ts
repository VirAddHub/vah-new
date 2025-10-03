// hooks/useSearch.ts
// Hook for debounced search with automatic background refresh

import useSWR, { SWRConfiguration } from 'swr';
import { useDebouncedValue } from './useDebouncedValue';

export type SearchResponse<T> = {
    items: T[];
    total: number;
};

export interface UseSearchOptions {
    /**
     * Debounce delay in milliseconds
     * @default 300
     */
    debounceMs?: number;

    /**
     * Refresh interval in milliseconds (background polling only)
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
 *
 * KEY BEHAVIOR:
 * - User types: debounced by `debounceMs` (default 300ms)
 * - After typing stops: fetches immediately
 * - Background refresh: every `refreshMs` (default 30s)
 * - Page/filter changes: fetch immediately (no debounce)
 *
 * @param rawQuery - The raw search query (will be debounced)
 * @param page - Current page number
 * @param pageSize - Items per page
 * @param opts - Configuration options
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const { data, items, total, isLoading, isValidating } = useSearch<MailItem>(
 *   query,
 *   page,
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

    // Debounce ONLY the query to avoid excessive API calls while typing
    const q = useDebouncedValue(rawQuery.trim(), debounceMs);

    // Include q, page, pageSize in key so ANY change triggers immediate fetch
    const key = q
        ? (['/api/search', { q, page, pageSize }] as const)
        : null;

    const swr = useSWR<SearchResponse<T>>(key, {
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
        query: q,
        isSearching: !!q,
    };
}
