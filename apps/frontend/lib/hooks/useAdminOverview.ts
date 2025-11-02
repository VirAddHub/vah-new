// apps/frontend/lib/hooks/useAdminOverview.ts
// Custom hooks for admin overview data

import useSWR from 'swr';
import { api } from '../http';

// Simple fetcher that uses our unified API client
async function fetcher(url: string) {
    const result = await api.get(url);
    if (!result.ok) {
        throw new Error(result.message || 'Failed to fetch');
    }
    return result.data;
}

export const useAdminOverview = () =>
    useSWR('/api/bff/admin/overview', fetcher, {
        revalidateOnFocus: false,
        refreshInterval: 60000, // Refresh every minute
    });

export const useAdminHealth = () =>
    useSWR('/api/bff/admin/health/summary', fetcher, {
        refreshInterval: 60000, // Refresh every minute
    });

export const useAdminDependencies = () =>
    useSWR('/api/bff/admin/health/dependencies', fetcher, {
        refreshInterval: 60000,
    });

export const useAdminActivity = (limit = 20) =>
    useSWR(`/api/bff/admin/activity?limit=${limit}`, fetcher, {
        revalidateOnFocus: false,
    });

export const useForwardingStats = (days = 90) =>
    useSWR(`/api/bff/admin/forwarding/stats?days=${days}`, fetcher, {
        revalidateOnFocus: false,
        refreshInterval: 30000, // Refresh every 30 seconds
    });

