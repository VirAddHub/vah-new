// src/server/services/pricing.ts
// Server-side pricing service for centralized plan and pricing logic

import { getPool } from '../db';

export interface ServerPlan {
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
    sort: number;
    effective_at?: string;
    retired_at?: string;
    created_at: string;
    updated_at: string;
}

export interface PricingInfo {
    monthlyPrice: number;
    annualPrice: number;
    monthlySavingsPct: number;
    monthlyPlan?: ServerPlan;
    annualPlan?: ServerPlan;
}

/**
 * Server-side pricing service
 * Provides centralized pricing logic for all server-side operations
 */
export class PricingService {
    private static instance: PricingService;
    private plansCache: ServerPlan[] | null = null;
    private cacheExpiry: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    private constructor() {}

    static getInstance(): PricingService {
        if (!PricingService.instance) {
            PricingService.instance = new PricingService();
        }
        return PricingService.instance;
    }

    /**
     * Get all active plans from database
     */
    async getActivePlans(): Promise<ServerPlan[]> {
        // Check cache first
        if (this.plansCache && Date.now() < this.cacheExpiry) {
            return this.plansCache;
        }

        const pool = getPool();
        try {
            const result = await pool.query(`
                SELECT 
                    id,
                    name,
                    slug,
                    description,
                    price_pence,
                    interval,
                    currency,
                    features_json,
                    trial_days,
                    active,
                    vat_inclusive,
                    sort,
                    effective_at,
                    retired_at,
                    created_at,
                    updated_at
                FROM plans
                WHERE active = true AND retired_at IS NULL
                ORDER BY sort ASC, price_pence ASC
            `);

            const plans: ServerPlan[] = result.rows.map(plan => ({
                ...plan,
                price: plan.price_pence / 100,
                priceFormatted: `£${(plan.price_pence / 100).toFixed(2)}`,
                features: Array.isArray(plan.features_json) 
                    ? plan.features_json 
                    : JSON.parse(plan.features_json || '[]')
            }));

            // Update cache
            this.plansCache = plans;
            this.cacheExpiry = Date.now() + this.CACHE_DURATION;

            return plans;
        } catch (error: any) {
            console.error('[PricingService] Error fetching plans:', error);
            throw new Error('Failed to fetch pricing plans');
        }
    }

    /**
     * Get pricing information with calculations
     */
    async getPricingInfo(): Promise<PricingInfo> {
        const plans = await this.getActivePlans();
        
        const monthlyPlan = plans.find(p => p.interval === 'month');
        const annualPlan = plans.find(p => p.interval === 'year');
        
        // Fallback prices if no plans found
        const monthlyPrice = monthlyPlan?.price ?? 9.99;
        const annualPrice = annualPlan?.price ?? 89.99;
        
        // Calculate savings percentage
        const monthlySavingsPct = monthlyPlan && annualPlan
            ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)
            : 0;

        return {
            monthlyPrice,
            annualPrice,
            monthlySavingsPct,
            monthlyPlan,
            annualPlan
        };
    }

    /**
     * Get plan by ID
     */
    async getPlanById(planId: string): Promise<ServerPlan | null> {
        const plans = await this.getActivePlans();
        return plans.find(p => p.id === planId) || null;
    }

    /**
     * Get plan by slug
     */
    async getPlanBySlug(slug: string): Promise<ServerPlan | null> {
        const plans = await this.getActivePlans();
        return plans.find(p => p.slug === slug) || null;
    }

    /**
     * Format price for display
     */
    formatPrice(pricePence: number, currency: string = 'GBP'): string {
        const symbol = currency === 'GBP' ? '£' : currency;
        return `${symbol}${(pricePence / 100).toFixed(2)}`;
    }

    /**
     * Calculate annual savings
     */
    calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
        const saved = monthlyPrice * 12 - annualPrice;
        return Math.round((saved / (monthlyPrice * 12)) * 100);
    }

    /**
     * Clear cache (useful after admin updates)
     */
    clearCache(): void {
        this.plansCache = null;
        this.cacheExpiry = 0;
    }

    /**
     * Get pricing for billing calculations
     */
    async getBillingPricing(planId: string): Promise<{
        pricePence: number;
        interval: string;
        currency: string;
        planName: string;
    } | null> {
        const plan = await this.getPlanById(planId);
        if (!plan) return null;

        return {
            pricePence: plan.price_pence,
            interval: plan.interval,
            currency: plan.currency,
            planName: plan.name
        };
    }
}

// Export singleton instance
export const pricingService = PricingService.getInstance();
