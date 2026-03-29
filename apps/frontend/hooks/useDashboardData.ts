'use client';

import { useEffect, useRef } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import { swrFetcher } from '@/services/http';
import { DASHBOARD_BOOTSTRAP_KEY } from '@/lib/swrKeys';

export const KEYS = {
    BOOTSTRAP: DASHBOARD_BOOTSTRAP_KEY,
    // Include business_id in key so SWR cache is per-business (no stale data on switch)
    MAIL: (businessId: number | null) =>
        `/api/bff/mail-items?includeArchived=true&business_id=${businessId ?? 'primary'}`,
    TAGS: '/api/bff/tags',
    ACCOUNT: '/api/bff/account',
    PROFILE: '/api/bff/profile',
    COMPLIANCE: '/api/bff/profile/compliance',
    BILLING_OVERVIEW: '/api/bff/billing/overview',
    BILLING_INVOICES: '/api/bff/billing/invoices?page=1&page_size=12',
    WHOAMI: '/api/bff/auth/whoami',
};

/** Session-sensitive dashboard bundle: no long dedupe, always treat as stale-friendly. */
const BOOTSTRAP_SWR_CONFIG: SWRConfiguration = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    dedupingInterval: 0,
};

// Default config for less critical data (tags, mail, etc.)
const DEFAULT_CONFIG: SWRConfiguration = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
};

const BOOTSTRAP_DEBUG = process.env.NEXT_PUBLIC_DASHBOARD_BOOTSTRAP_DEBUG === '1';

export type DashboardBootstrapPayload = {
    whoami: { user?: Record<string, unknown> } | null;
    profile: unknown;
    compliance: unknown;
    billingOverview: unknown | null;
    fetchedAt: string;
    _debug?: {
        t: number;
        sources: Record<string, string>;
        verificationStateFrom: string;
        planFrom: string;
    };
};

export type DashboardBootstrapResponse = {
    ok: true;
    data: DashboardBootstrapPayload;
};

/**
 * Single SWR subscription for whoami + profile + compliance + billing overview.
 * All other dashboard session hooks should derive from this to avoid competing caches.
 */
export function useDashboardBootstrap(options?: SWRConfiguration) {
    const swr = useSWR<DashboardBootstrapResponse>(
        KEYS.BOOTSTRAP,
        swrFetcher,
        { ...BOOTSTRAP_SWR_CONFIG, ...options }
    );

    const lastLoggedFetchedAt = useRef<string | null>(null);
    useEffect(() => {
        if (!BOOTSTRAP_DEBUG || !swr.data?.ok || !swr.data.data?.fetchedAt) return;
        if (lastLoggedFetchedAt.current === swr.data.data.fetchedAt) return;
        lastLoggedFetchedAt.current = swr.data.data.fetchedAt;
        // eslint-disable-next-line no-console
        console.info('[dashboard-bootstrap] payload', {
            t: Date.now(),
            fetchedAt: swr.data.data.fetchedAt,
            verificationStateFrom: '/api/profile/compliance (via bootstrap)',
            planStatusFrom: '/api/billing/overview (via bootstrap)',
            profileFrom: '/api/profile (via bootstrap)',
            _debug: swr.data.data._debug,
        });
    }, [swr.data]);

    return swr;
}

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

/** Profile row from bootstrap only (avoids a second SWR cache for the same session). */
export function useProfile(options?: SWRConfiguration) {
    const { data, ...rest } = useDashboardBootstrap(options);
    const profilePayload =
        data?.ok === true && data.data?.profile != null
            ? { ok: true as const, data: data.data.profile as any }
            : undefined;
    return {
        ...rest,
        data: profilePayload,
    };
}

export function useCompliance(options?: SWRConfiguration) {
    const { data, ...rest } = useDashboardBootstrap(options);
    const compliancePayload =
        data?.ok === true && data.data && 'compliance' in data.data
            ? { ok: true as const, data: data.data.compliance as any }
            : undefined;
    return {
        ...rest,
        data: compliancePayload,
    };
}

export function useBillingOverview(options?: SWRConfiguration) {
    const { data, ...rest } = useDashboardBootstrap(options);
    const billingPayload =
        data?.ok === true
            ? { ok: true as const, data: (data.data.billingOverview ?? null) as any }
            : undefined;
    return {
        ...rest,
        data: billingPayload,
    };
}

export function useWhoAmI(options?: SWRConfiguration) {
    const { data, ...rest } = useDashboardBootstrap(options);
    const whoamiPayload =
        data?.ok === true && data.data?.whoami != null
            ? {
                  ok: true as const,
                  data: data.data.whoami as any,
                  authenticated: true as const,
              }
            : undefined;
    return {
        ...rest,
        data: whoamiPayload,
    };
}

export function useInvoices(options?: SWRConfiguration) {
    return useSWR(KEYS.BILLING_INVOICES, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}

export const KEYS_BUSINESSES = '/api/bff/account/businesses';

export function useBusinesses(options?: SWRConfiguration) {
    return useSWR(KEYS_BUSINESSES, swrFetcher, { ...DEFAULT_CONFIG, ...options });
}
