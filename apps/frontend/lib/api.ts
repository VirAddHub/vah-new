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

// Import the api object from http.ts
import { api as apiObject, type ApiResponse } from './http';

/**
 * Function wrapper for api object to match service expectations
 * Services call: const { data } = await api(path, { method: 'GET', ... })
 * This wrapper extracts the method and calls the appropriate api method
 */
export async function api<T = any>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body;

    let result: ApiResponse<any>;

    try {
        switch (method) {
            case 'GET':
                result = await apiObject.get<T>(path, init);
                break;
            case 'POST':
                // Parse body if it's a string (JSON)
                const postBody = body
                    ? (typeof body === 'string' ? JSON.parse(body) : body)
                    : undefined;
                result = await apiObject.post<T>(path, postBody, init);
                break;
            case 'PUT':
                const putBody = body
                    ? (typeof body === 'string' ? JSON.parse(body) : body)
                    : undefined;
                result = await apiObject.put<T>(path, putBody, init);
                break;
            case 'DELETE':
                result = await apiObject.del<T>(path, init);
                break;
            default:
                throw new Error(`Unsupported HTTP method: ${method}`);
        }

        // Ensure result is always defined and has the expected shape
        if (!result || typeof result !== 'object') {
            return {
                ok: false,
                status: 500,
                code: 'invalid_response',
                message: 'Invalid response from server',
            } as ApiResponse<T>;
        }

        // apiObject methods return { ok: true, data: T } or { ok: false, status, code, message }
        return result as ApiResponse<T>;
    } catch (error) {
        // Always return a proper ApiResponse, never undefined
        return {
            ok: false,
            data: undefined,
            status: 500,
            code: 'request_failed',
            message: error instanceof Error ? error.message : 'Request failed',
        } as ApiResponse<T>;
    }
}
