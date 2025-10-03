// hooks/usePaged.ts
// Hook for paginated lists with automatic background refresh

import { useAuthedSWR } from '@/lib/useAuthedSWR';

type PagedEnvelope<T> =
  | { items: T[]; total?: number }
  | { data: { items: T[]; total?: number } }
  | T[]; // be liberal in what we accept

type PagedOptions = {
  refreshMs?: number;
};

function normalizePaged<T>(data: PagedEnvelope<T> | undefined): { items: T[]; total: number } {
  if (!data) return { items: [], total: 0 };
  // shape: { data: { items, total } }
  // @ts-ignore – allow flexible shapes
  if (data?.data?.items) {
    // @ts-ignore
    return { items: data.data.items as T[], total: Number(data.data.total ?? data.data.count ?? 0) };
  }
  // shape: { items, total }
  // @ts-ignore
  if (Array.isArray(data?.items)) {
    // @ts-ignore
    return { items: (data as any).items as T[], total: Number((data as any).total ?? (data as any).count ?? 0) };
  }
  // bare array
  if (Array.isArray(data)) return { items: data as T[], total: (data as T[]).length };
  return { items: [], total: 0 };
}

export function usePaged<T = any>(
  key: string | readonly [string, any],
  opts: PagedOptions = {}
) {
  const { data, error, isLoading, isValidating, mutate } = useAuthedSWR<PagedEnvelope<T>>(key, {
    refreshInterval: opts.refreshMs ?? 0,
  });

  const { items, total } = normalizePaged<T>(data);

  return {
    items: items as T[],
    total: total as number,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}