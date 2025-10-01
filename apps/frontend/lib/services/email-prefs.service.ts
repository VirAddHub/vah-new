// lib/services/email-prefs.service.ts
// Email preferences API service

import { api } from '../api';

export interface EmailPreferences {
    marketing_emails: boolean;
    notification_emails: boolean;
    mail_received_alerts: boolean;
    forwarding_updates: boolean;
    billing_reminders: boolean;
}

export const emailPrefsService = {
    /**
     * Get email preferences
     */
    async getPreferences(): Promise<{ ok: boolean; prefs: EmailPreferences }> {
        const { data } = await api('/api/email-prefs', { method: 'GET' });
        return data;
    },

    /**
     * Create email preferences
     */
    async createPreferences(prefs: Partial<EmailPreferences>): Promise<{ ok: boolean }> {
        const { data } = await api('/api/email-prefs', {
            method: 'POST',
            body: JSON.stringify(prefs),
        });
        return data;
    },

    /**
     * Update email preferences
     */
    async updatePreferences(prefs: Partial<EmailPreferences>): Promise<{ ok: boolean }> {
        const { data } = await api('/api/email-prefs', {
            method: 'PATCH',
            body: JSON.stringify(prefs),
        });
        return data;
    },
};
