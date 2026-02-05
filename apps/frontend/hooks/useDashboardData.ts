import useSWR, { SWRConfiguration } from 'swr';
import { swrFetcher } from '@/services/http';

export const KEYS = {
    MAIL: '/api/bff/mail-items?includeArchived=true',
    TAGS: '/api/bff/tags',
    ACCOUNT: '/api/bff/account',
    PROFILE: '/api/bff/profile',
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

export function useMail(options?: SWRConfiguration) {
    return useSWR(KEYS.MAIL, swrFetcher, { ...DEFAULT_CONFIG, ...options });
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

export function useBillingOverview(options?: SWRConfiguration) {
    return useSWR(KEYS.BILLING_OVERVIEW, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useInvoices(options?: SWRConfiguration) {
    return useSWR(KEYS.BILLING_INVOICES, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export function useWhoAmI(options?: SWRConfiguration) {
    return useSWR(KEYS.WHOAMI, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}
