'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { swrFetcher } from '@/services/http';

export const KEYS = {
    // Include business_id in key so SWR cache is per-business (no stale data on switch)
    MAIL: (businessId: number | null) =>
        `/api/bff/mail-items?includeArchived=true&business_id=${businessId ?? 'primary'}`,
    TAGS: '/api/bff/tags',
    ACCOUNT: '/api/bff/account',
    PROFILE: '/api/bff/profile',
    COMPLIANCE: '/api/bff/profile/compliance',
    BILLING_OVERVIEW: '/api/bff/billing/overview',
    BILLING_INVOICES: '/api/bff/billing/invoices?page=1&page_size=12', // Simplified for now, pagination might need dynamic key
    WHOAMI: '/api/bff/auth/whoami',
};

// Default config for less aggressive revalidation
const DEFAULT_CONFIG: SWRConfiguration = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute
};

export function useMail(businessId?: number | null, options?: SWRConfiguration) {
    const key = KEYS.MAIL(businessId ?? null);
    return useSWR(key, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useTags(options?: SWRConfiguration) {
    return useSWR(KEYS.TAGS, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useAccount(options?: SWRConfiguration) {
    return useSWR(KEYS.ACCOUNT, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useProfile(options?: SWRConfiguration) {
    return useSWR(KEYS.PROFILE, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useCompliance(options?: SWRConfiguration) {
    return useSWR(KEYS.COMPLIANCE, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useBillingOverview(options?: SWRConfiguration) {
    return useSWR(KEYS.BILLING_OVERVIEW, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useInvoices(options?: SWRConfiguration) {
    return useSWR(KEYS.BILLING_INVOICES, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useWhoAmI(options?: SWRConfiguration) {
    return useSWR(KEYS.WHOAMI, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export const KEYS_BUSINESSES = '/api/bff/account/businesses';

export function useBusinesses(options?: SWRConfiguration) {
    return useSWR(KEYS_BUSINESSES, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}
