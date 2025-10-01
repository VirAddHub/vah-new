// lib/services/admin.service.ts
// Admin panel API service

import { api } from '../api';

export interface AdminUser {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    is_admin: boolean;
    role: string;
    status: string;
    created_at: string;
    last_login?: string;
}

export interface AdminMailItem {
    id: number;
    user_id: number;
    subject?: string;
    sender?: string;
    status: string;
    received_at: string;
}

export const adminService = {
    /**
     * Get all users (admin only)
     */
    async getUsers(): Promise<{ ok: boolean; data: AdminUser[] }> {
        const { data } = await api('/api/admin/users', { method: 'GET' });
        return data;
    },

    /**
     * Update user (admin only)
     */
    async updateUser(id: number, updates: Partial<AdminUser>): Promise<{ ok: boolean; data: AdminUser }> {
        const { data } = await api(`/api/admin/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return data;
    },

    /**
     * Update user KYC status (admin only)
     */
    async updateKYCStatus(id: number, status: string): Promise<{ ok: boolean }> {
        const { data } = await api(`/api/admin/users/${id}/kyc-status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
        return data;
    },

    /**
     * Get all mail items (admin only)
     */
    async getMailItems(): Promise<{ ok: boolean; data: AdminMailItem[] }> {
        const { data } = await api('/api/admin/mail-items', { method: 'GET' });
        return data;
    },

    /**
     * Get specific mail item (admin only)
     */
    async getMailItem(id: number): Promise<{ ok: boolean; data: AdminMailItem }> {
        const { data } = await api(`/api/admin/mail-items/${id}`, { method: 'GET' });
        return data;
    },

    /**
     * Update mail item (admin only)
     */
    async updateMailItem(id: number, updates: Partial<AdminMailItem>): Promise<{ ok: boolean; data: AdminMailItem }> {
        const { data } = await api(`/api/admin/mail-items/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data;
    },

    /**
     * Log physical dispatch (admin only)
     */
    async logPhysicalDispatch(
        id: number,
        dispatch: {
            tracking_number?: string;
            courier?: string;
            dispatched_at?: string;
        }
    ): Promise<{ ok: boolean }> {
        const { data } = await api(`/api/admin/mail-items/${id}/log-physical-dispatch`, {
            method: 'POST',
            body: JSON.stringify(dispatch),
        });
        return data;
    },

    /**
     * Get forwarding requests (admin only)
     */
    async getForwardingRequests(): Promise<{ ok: boolean; data: any[] }> {
        const { data } = await api('/api/admin/forwarding/requests', { method: 'GET' });
        return data;
    },

    /**
     * Update forwarding request (admin only)
     */
    async updateForwardingRequest(id: number, updates: any): Promise<{ ok: boolean; data: any }> {
        const { data } = await api(`/api/admin/forwarding/requests/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return data;
    },

    /**
     * Fulfill forwarding request (admin only)
     */
    async fulfillForwardingRequest(
        id: number,
        fulfillment: {
            tracking_number?: string;
            courier?: string;
        }
    ): Promise<{ ok: boolean }> {
        const { data } = await api(`/api/admin/forwarding/requests/${id}/fulfill`, {
            method: 'POST',
            body: JSON.stringify(fulfillment),
        });
        return data;
    },

    /**
     * Get plans (admin only)
     */
    async getPlans(): Promise<{ ok: boolean; data: any[] }> {
        const { data } = await api('/api/admin/plans', { method: 'GET' });
        return data;
    },

    /**
     * Update plan (admin only)
     */
    async updatePlan(id: number, updates: any): Promise<{ ok: boolean; data: any }> {
        const { data } = await api(`/api/admin/plans/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return data;
    },

    /**
     * Get audit logs (admin only)
     */
    async getAuditLogs(params?: { limit?: number; offset?: number }): Promise<{ ok: boolean; data: any[] }> {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());

        const { data } = await api(`/api/admin-audit?${queryParams.toString()}`, { method: 'GET' });
        return data;
    },

    /**
     * Get forwarding audit logs (admin only)
     */
    async getForwardingAuditLogs(): Promise<{ ok: boolean; data: any[] }> {
        const { data } = await api('/api/admin-forward-audit', { method: 'GET' });
        return data;
    },
};
