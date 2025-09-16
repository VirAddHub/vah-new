'use client';

import useSWR, { type SWRConfiguration, type BareFetcher } from 'swr';
import { apiClient, handleApiError } from './api-client';

// A strongly-typed JSON fetcher that throws on !res.ok
export type Json = unknown;

export const jsonFetcher: BareFetcher<Json> = async (url: string) => {
    const res: Response = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as Json;
};

// If your endpoints return a { ok: boolean } envelope
export interface OkEnvelope<T = unknown> {
    ok: boolean;
    data?: T;
    [k: string]: unknown;
}

// Example helper to use that envelope
export function useOk<T = unknown>(
    key: string | null,
    config?: SWRConfiguration<OkEnvelope<T>>
) {
    // Important: force the key to null when absent so SWR types match
    const k = key ?? null;
    return useSWR<OkEnvelope<T>>(k, jsonFetcher as BareFetcher<OkEnvelope<T>>, config);
}

// Generic JSON useSWR (no envelope)
export function useJson<T = unknown>(
    key: string | null,
    config?: SWRConfiguration<T>
) {
    const k = key ?? null;
    return useSWR<T>(k, jsonFetcher as BareFetcher<T>, config);
}

// Generic fetcher function
const fetcher = async (url: string) => {
    try {
        return await apiClient.get(url);
    } catch (error) {
        throw new Error(handleApiError(error));
    }
};

// Mail hooks
export function useMail() {
    const { data, error, mutate, isLoading } = useSWR('/mail', fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
        revalidateOnFocus: true,
    });

    return {
        mail: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

export function useMailItem(id: string) {
    const { data, error, mutate, isLoading } = useSWR(
        id ? `/mail/${id}` : null,
        id ? fetcher : null
    );

    return {
        mailItem: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

export function useMailStats() {
    const { data, error, mutate, isLoading } = useSWR('/mail/stats', fetcher, {
        refreshInterval: 60000, // Refresh every minute
    });

    return {
        stats: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

// Invoice hooks
export function useInvoices() {
    const { data, error, mutate, isLoading } = useSWR('/invoices', fetcher);

    return {
        invoices: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

export function useInvoice(id: string) {
    const { data, error, mutate, isLoading } = useSWR(
        id ? `/invoices/${id}` : null,
        id ? fetcher : null
    );

    return {
        invoice: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

// Profile hooks
export function useProfile() {
    const { data, error, mutate, isLoading } = useSWR('/profile', fetcher);

    return {
        profile: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

// Admin hooks
export function useAdminMailItems() {
    const { data, error, mutate, isLoading } = useSWR('/admin/mail-items', fetcher);

    return {
        mailItems: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

export function useAdminPlans() {
    const { data, error, mutate, isLoading } = useSWR('/admin/plans', fetcher);

    return {
        plans: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

// Health check hook
export function useHealthCheck() {
    const { data, error, isLoading } = useOk('/healthz', {
        refreshInterval: 30000,
        revalidateOnFocus: false,
    });

    return {
        isHealthy: !!data?.ok,
        isLoading,
        error,
    };
}

// Generic hook for any endpoint
export function useApiData<T>(endpoint: string | null, options?: SWRConfiguration<T>) {
    const { data, error, mutate, isLoading } = useSWR<T>(
        endpoint,
        endpoint ? (fetcher as BareFetcher<T>) : null,
        options
    );

    return {
        data,
        isLoading,
        error,
        refetch: mutate,
    };
}
