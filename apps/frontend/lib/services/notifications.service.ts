// lib/services/notifications.service.ts
// Notifications API service

import { api } from '../api';

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
}

export const notificationsService = {
    /**
     * Get all notifications for current user
     */
    async getNotifications(): Promise<{ ok: boolean; data: Notification[] }> {
        const { data } = await api('/api/notifications', { method: 'GET' });
        return data;
    },

    /**
     * Mark notification as read
     */
    async markAsRead(id: number): Promise<{ ok: boolean }> {
        const { data } = await api(`/api/notifications/${id}/read`, {
            method: 'POST',
        });
        return data;
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<{ ok: boolean }> {
        const { data } = await api('/api/notifications/mark-all-read', {
            method: 'POST',
        });
        return data;
    },
};
