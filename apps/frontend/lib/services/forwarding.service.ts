// lib/services/forwarding.service.ts
// Mail forwarding API service

import { api } from '../api';

export interface ForwardingRequest {
    id: number;
    user_id: number;
    letter_id: number;
    to_name: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postal: string;
    country: string;
    reason?: string;
    method?: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    tracking?: string;
    courier?: string;
    created_at: string;
    updated_at: string;
}

export interface ForwardingRequestsResponse {
    ok: boolean;
    data: ForwardingRequest[];
}

export const forwardingService = {
    /**
     * Get all forwarding requests for current user
     */
    async getForwardingRequests(): Promise<ForwardingRequestsResponse> {
        const { data } = await api('/api/forwarding/requests', { method: 'GET' });
        console.log('[forwardingService.getForwardingRequests] api() returned data:', data);
        // Backend returns: { ok: true, data: [...], total, page } or { ok: true, items: [...] }
        // We need to return: { ok: boolean, data: ForwardingRequest[] }
        return {
            ok: data.ok ?? false,
            data: Array.isArray(data.data) ? data.data : (Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []))
        };
    },

    /**
     * Create a new forwarding request
     */
    async createForwardingRequest(request: {
        letter_id: number;
        to_name: string;
        address1: string;
        address2?: string;
        city: string;
        state?: string;
        postal: string;
        country: string;
        reason?: string;
        method?: string;
    }): Promise<{ ok: boolean; data: ForwardingRequest }> {
        const { data } = await api('/api/forwarding/requests', {
            method: 'POST',
            body: JSON.stringify(request),
        });
        return data;
    },

    /**
     * Get a specific forwarding request
     */
    async getForwardingRequest(id: number): Promise<{ ok: boolean; data: ForwardingRequest }> {
        const { data } = await api(`/api/forwarding/requests/${id}`, { method: 'GET' });
        return data;
    },

    /**
     * Bulk forward multiple mail items
     */
    async bulkForward(ids: number[]): Promise<{ ok: boolean; forwarded: number[]; errors: any[] }> {
        const { data } = await api('/api/forward/bulk', {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
        return data;
    },
};
