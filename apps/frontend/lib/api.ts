/**
 * Typed API client helpers
 * Thin wrappers around apiFetch for common endpoints
 */

import { apiFetch, ApiError, PaginatedResponse } from './apiFetch';

export interface User {
    id: number;
    email: string;
    is_admin: boolean;
    role: string;
    kyc_status: string | null;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    forwarding_address: any;
    plan_status: string | null;
    plan_id: number | null;
}

export interface Plan {
    id: number | string;
    name: string;
    slug: string;
    description: string | null;
    price_pence: number;
    price: number;
    priceFormatted: string;
    interval: 'month' | 'year';
    currency: string;
    features: string[];
    trial_days: number | null;
    active: boolean;
    isAnnual: boolean;
    isMonthly: boolean;
}

export interface MailItem {
    id: number;
    user_id: number;
    received_date: string;
    sender_name: string | null;
    subject: string | null;
    user_title: string | null;
    tag: string | null;
    status: string;
    // ... other fields
}

export interface GetMailItemsParams {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
}

/**
 * Get current authenticated user
 */
export async function getWhoAmI(): Promise<{ user: User }> {
    return apiFetch<{ user: User }>('/auth/whoami');
}

/**
 * Get available plans
 */
export async function getPlans(): Promise<Plan[]> {
    const response = await apiFetch<PaginatedResponse<Plan>>('/plans');
    return response.items;
}

/**
 * Get mail items (paginated)
 */
export async function getMailItems(
    params: GetMailItemsParams = {}
): Promise<PaginatedResponse<MailItem>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    const queryString = query.toString();
    const path = `/mail${queryString ? `?${queryString}` : ''}`;

    return apiFetch<PaginatedResponse<MailItem>>(path);
}

// Re-export ApiError for convenience
export { ApiError } from './apiFetch';

// Re-export api function from http.ts for backward compatibility with services
// Services expect: const { data } = await api(path, options)
export { api } from './http';
