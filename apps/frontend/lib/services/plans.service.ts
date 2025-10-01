// lib/services/plans.service.ts
// Subscription plans API service

import { api } from '../api';

export interface Plan {
    id: number;
    name: string;
    description?: string;
    price_monthly: number;
    price_annual: number;
    features: string[];
    is_active: boolean;
}

export const plansService = {
    /**
     * Get all available subscription plans
     */
    async getPlans(): Promise<{ ok: boolean; data: Plan[] }> {
        const { data } = await api('/api/plans', { method: 'GET' });
        return data;
    },
};
