// hooks/usePlans.ts
// Shared hook for fetching and managing plans data across components

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../lib/apiClient';

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
            
            console.log('[usePlans] Fetching plans from /api/plans...');
            const response = await apiClient.get('/api/plans', {
                // Force fresh data - disable any client-side caching
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('[usePlans] Response:', response);
            
            if (response.ok && response.data) {
                console.log('[usePlans] Plans loaded:', response.data);
                setPlans(response.data);
            } else {
                console.error('[usePlans] Failed to load plans:', response);
                setError('Failed to load pricing plans');
            }
        } catch (err) {
            console.error('[usePlans] Error loading plans:', err);
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

/**
 * Hook for getting pricing information with automatic fallbacks
 */
export function usePricing() {
    const { plans, loading, error, getMonthlyPlan, getAnnualPlan } = usePlans();
    
    const monthlyPlan = getMonthlyPlan();
    const annualPlan = getAnnualPlan();
    
    // Fallback prices if API fails
    const fallbackMonthlyPrice = 9.97;
    const fallbackAnnualPrice = 89.99;
    
    const monthlyPrice = monthlyPlan?.price ?? fallbackMonthlyPrice;
    const annualPrice = annualPlan?.price ?? fallbackAnnualPrice;
    
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
