// lib/services/billing.service.ts
// Billing and payments API service

import { api } from '../api';

export interface Invoice {
    id: number;
    user_id: number;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    due_date: string;
    paid_at?: string;
    invoice_number: string;
    created_at: string;
}

export interface BillingOverview {
    ok: boolean;
    current_plan?: string;
    next_billing_date?: string;
    amount_due?: number;
}

export interface SubscriptionStatus {
    ok: boolean;
    data: {
        plan_status: string;
        plan_name?: string;
        billing_cycle?: string;
        next_payment_date?: string;
    };
}

export const billingService = {
    /**
     * Get billing overview
     */
    async getBillingOverview(): Promise<BillingOverview> {
        const { data } = await api('/api/billing', { method: 'GET' });
        return data;
    },

    /**
     * Get all invoices for current user
     */
    async getInvoices(): Promise<{ ok: boolean; data: Invoice[] }> {
        const { data } = await api('/api/billing/invoices', { method: 'GET' });
        return data;
    },

    /**
     * Get invoice download link
     */
    async getInvoiceLink(id: number): Promise<{ ok: boolean; url: string }> {
        const { data } = await api(`/api/billing/invoices/${id}/link`, { method: 'GET' });
        return data;
    },

    /**
     * Get subscription status
     */
    async getSubscriptionStatus(): Promise<SubscriptionStatus> {
        const { data } = await api('/api/payments/subscriptions/status', { method: 'GET' });
        return data;
    },

    /**
     * Manage subscription (cancel, reactivate, etc.)
     */
    async manageSubscription(action: 'cancel' | 'reactivate'): Promise<{ ok: boolean }> {
        const { data } = await api('/api/payments/subscriptions', {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
        return data;
    },

    /**
     * Create GoCardless redirect flow
     */
    async createRedirectFlow(): Promise<{ ok: boolean; data: { redirect_flow_id: string; redirect_url: string } }> {
        const { data } = await api('/api/payments/redirect-flows', {
            method: 'POST',
        });
        return data;
    },
};
