// hooks/usePaged.ts
// Hook for paginated lists with automatic background refresh

import { useAuthedSWR } from '@/lib/useAuthedSWR';
import { SWRConfiguration } from 'swr';

type PagedResult<T> = {
    items: T[];
    total: number;
};

type PagedOptions = {
    refreshMs?: number;
};

export function usePaged<T = any>(
    pathOrKey: string | readonly [string, any],
    opts: PagedOptions = {}
) {
    const key = pathOrKey; // keep as-is (string path with query is fine)
    const { data, error, isLoading, isValidating, mutate } =
        useAuthedSWR<PagedResult<T>>(key, {
            refreshInterval: opts.refreshMs ?? 0,
        });

    return {
        items: data?.items ?? [],
        total: data?.total ?? 0,
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
