// apps/frontend/lib/hooks/useAdminOverview.ts
// Custom hooks for admin overview data

import useSWR from 'swr';
import { backendClient } from '../backendClient';

// Simple fetcher that uses our unified backend client
async function fetcher(url: string) {
    const result = await backendClient.get(url);
    if (!result.ok) {
        throw new Error(result.message || 'Failed to fetch');
    }
    // Backend returns { ok: true, ...data } or { ok: true, data: {...} }
    // If result.data has an 'ok' field, it means backend already wrapped it, return as-is
    // Otherwise, backend returned data directly, so use result.data
    return result.data?.ok !== undefined ? result.data : result.data;
}

export const useAdminOverview = () =>
    useSWR('/api/admin/overview', fetcher, {
        revalidateOnFocus: false,
        refreshInterval: 60000, // Refresh every minute
    });

export const useAdminHealth = () =>
    useSWR('/api/admin/health/summary', fetcher, {
        refreshInterval: 60000, // Refresh every minute
    });

export const useAdminDependencies = () =>
    useSWR('/api/admin/health/dependencies', fetcher, {
        refreshInterval: 60000,
    });

export const useAdminActivity = (limit = 20) =>
    useSWR(`/api/admin/activity?limit=${limit}`, fetcher, {
        revalidateOnFocus: false,
    });

export const useForwardingStats = (days = 90) =>
    useSWR(`/api/admin/forwarding/stats?days=${days}`, fetcher, {
        revalidateOnFocus: false,
        refreshInterval: 30000, // Refresh every 30 seconds
    });

