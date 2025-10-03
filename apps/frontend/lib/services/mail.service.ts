// lib/services/mail.service.ts
// Mail management API service

import { api } from '../api';

export interface MailItem {
    id: number;
    user_id: number;
    subject?: string;
    sender?: string;
    sender_name?: string;
    description?: string;
    received_at: string;
    status: 'received' | 'scanned' | 'forwarded' | 'archived';
    forwarding_status?: string;
    scan_url?: string;
    is_read?: boolean;
    created_at: string;
    updated_at: string;
}

export interface MailItemsResponse {
    ok: boolean;
    data: MailItem[];
}

export interface ScanUrlResponse {
    ok: boolean;
    url: string;
    expires_at: number;
}

export const mailService = {
    /**
     * Get all mail items for current user
     */
    async getMailItems(): Promise<MailItemsResponse> {
        const { data } = await api('/api/mail-items', { method: 'GET' });
        console.log('[mailService.getMailItems] api() returned data:', data);
        // Backend returns: { ok: true, data: [...], total, page }
        // We need to return: { ok: boolean, data: MailItem[] }
        return {
            ok: data.ok ?? false,
            data: Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
        };
    },

    /**
     * Get a specific mail item
     */
    async getMailItem(id: number): Promise<{ ok: boolean; data: MailItem }> {
        const { data } = await api(`/api/mail-items/${id}`, { method: 'GET' });
        return data;
    },

    /**
     * Update mail item (e.g., mark as read, archive)
     */
    async updateMailItem(id: number, updates: Partial<MailItem>): Promise<{ ok: boolean; data: MailItem }> {
        const { data } = await api(`/api/mail-items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return data;
    },

    /**
     * Get secure scan URL for a mail item
     */
    async getScanUrl(id: number): Promise<ScanUrlResponse> {
        const { data } = await api(`/api/mail-items/${id}/scan-url`, { method: 'GET' });
        return data;
    },

    /**
     * Search mail items
     */
    async searchMail(query: string, limit = 20, offset = 0): Promise<MailItemsResponse> {
        const { data } = await api(`/api/mail-search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`, {
            method: 'GET',
        });
        return data;
    },

    /**
     * Forward a mail item
     */
    async forwardMail(mailItemId: number, recipient: string, notes?: string): Promise<{ ok: boolean }> {
        const { data } = await api('/api/mail/forward', {
            method: 'POST',
            body: JSON.stringify({
                mail_item_id: mailItemId,
                recipient,
                notes,
            }),
        });
        return data;
    },
};
