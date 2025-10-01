// lib/services/support.service.ts
// Support tickets API service

import { api } from '../api';

export interface SupportTicket {
    id: number;
    user_id: number;
    subject: string;
    message: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
}

export const supportService = {
    /**
     * Get all support tickets for current user
     */
    async getTickets(): Promise<{ ok: boolean; data: SupportTicket[] }> {
        const { data } = await api('/api/support/tickets', {
            method: 'GET',
        });
        return data;
    },

    /**
     * Create a support ticket
     */
    async createTicket(ticket: { subject: string; message: string }): Promise<{ ok: boolean; data: SupportTicket }> {
        const { data } = await api('/api/support/tickets', {
            method: 'POST',
            body: JSON.stringify(ticket),
        });
        return data;
    },

    /**
     * Close a support ticket
     */
    async closeTicket(id: number): Promise<{ ok: boolean }> {
        const { data } = await api(`/api/support/tickets/${id}/close`, {
            method: 'POST',
        });
        return data;
    },
};
