// lib/services/plans.service.ts
// Subscription plans API service

import { api } from '../api';

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

export const plansService = {
    /**
     * Get all available subscription plans
     * Disables caching to ensure fresh pricing data
     */
    async getPlans(): Promise<{ ok: boolean; data: Plan[] }> {
        const { data } = await api('/api/plans', { 
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        return data;
    },

    /**
     * Refresh plans data (useful after admin updates)
     */
    async refreshPlans(): Promise<{ ok: boolean; data: Plan[] }> {
        // Force a fresh fetch by adding a timestamp parameter
        const timestamp = Date.now();
        const { data } = await api(`/api/plans?t=${timestamp}`, { 
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        return data;
    }
};
