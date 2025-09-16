'use client';

import useSWR from 'swr';
import { apiClient, handleApiError } from './api-client';

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
        fetcher
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
        fetcher
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
    const { data, error, isLoading } = useSWR('/healthz', fetcher, {
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
export function useApiData<T>(endpoint: string | null, options?: any) {
    const { data, error, mutate, isLoading } = useSWR<T>(
        endpoint,
        fetcher,
        options
    );

    return {
        data,
        isLoading,
        error,
        refetch: mutate,
    };
}
