// hooks/usePlans.ts
// Shared hook for fetching and managing plans data across components

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../lib/apiClient';
import { useInitialPricing } from '../contexts/PricingContext';

export interface Plan {
    id: string;
    name: string;
    slug: string;
    description?: string;
    price_pence: number;
    price: number;
    priceFormatted: string;
    interval: 'month' | 'year';
    currency: string;
    features: string[];
    trial_days: number;
    active: boolean;
    vat_inclusive: boolean;
    isMonthly: boolean;
    isAnnual: boolean;
}

interface UsePlansReturn {
    plans: Plan[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    getPlanById: (id: string) => Plan | undefined;
    getMonthlyPlan: () => Plan | undefined;
    getAnnualPlan: () => Plan | undefined;
}

/**
 * Custom hook for fetching and managing plans data
 * Provides cached data with automatic refetching and utility functions
 */
export function usePlans(): UsePlansReturn {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.get('/api/plans', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.ok && response.data) {
                // Handle new standardized format: backend returns { ok: true, data: [...] }
                // apiClient preserves it, so response.data is { ok: true, data: [...] }
                // We need to extract the array from response.data.data
                let plansArray: Plan[];
                if (Array.isArray(response.data)) {
                    // Legacy format: response.data is array directly
                    plansArray = response.data;
                } else if (response.data.ok && response.data.data) {
                    // New format: { ok: true, data: [...] }
                    if (Array.isArray(response.data.data)) {
                        plansArray = response.data.data;
                    } else if (response.data.data.items && Array.isArray(response.data.data.items)) {
                        // Paginated format: { ok: true, data: { items: [...] } }
                        plansArray = response.data.data.items;
                    } else {
                        setError('Invalid response format from plans API');
                        return;
                    }
                } else {
                    setError('Invalid response format from plans API');
                    return;
                }
                setPlans(plansArray);
            } else {
                setError('Failed to load pricing plans');
            }
        } catch (err) {
            setError('Failed to load pricing plans');
        } finally {
            setLoading(false);
        }
    }, []);

    const refetch = useCallback(async () => {
        await fetchPlans();
    }, [fetchPlans]);

    const getPlanById = useCallback((id: string): Plan | undefined => {
        return plans.find(plan => plan.id === id);
    }, [plans]);

    const getMonthlyPlan = useCallback((): Plan | undefined => {
        return plans.find(plan => plan.isMonthly);
    }, [plans]);

    const getAnnualPlan = useCallback((): Plan | undefined => {
        return plans.find(plan => plan.isAnnual);
    }, [plans]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    return {
        plans,
        loading,
        error,
        refetch,
        getPlanById,
        getMonthlyPlan,
        getAnnualPlan
    };
}

const FALLBACK_MONTHLY = 9.99;
const FALLBACK_ANNUAL = 89.99;

/**
 * Hook for getting pricing information with automatic fallbacks.
 * Uses server initialPricing when available so first paint has stable values (no flicker).
 */
export function usePricing() {
    const initialPricing = useInitialPricing();
    const { plans, loading, error, getMonthlyPlan, getAnnualPlan } = usePlans();

    const monthlyPlan = getMonthlyPlan();
    const annualPlan = getAnnualPlan();

    const monthlyPrice = monthlyPlan?.price ?? initialPricing?.monthlyPrice ?? FALLBACK_MONTHLY;
    const annualPrice = annualPlan?.price ?? initialPricing?.annualPrice ?? FALLBACK_ANNUAL;
    
    const monthlySavingsPct = useMemo(() => {
        if (monthlyPrice <= 0 || annualPrice <= 0) return 0;
        const saved = monthlyPrice * 12 - annualPrice;
        const pct = (saved / (monthlyPrice * 12)) * 100;
        return Math.round(pct);
    }, [monthlyPrice, annualPrice]);
    
    return {
        monthlyPrice,
        annualPrice,
        monthlySavingsPct,
        monthlyPlan,
        annualPlan,
        loading,
        error,
        hasApiData: !loading && !error && plans.length > 0
    };
}
