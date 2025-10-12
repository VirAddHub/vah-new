// lib/services/profile.service.ts
// User profile management API service

import { api } from '../api';

export interface UserProfile {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    company_name?: string;
    forwarding_address?: string;
    kyc_status?: string;
    created_at: string;
    updated_at: string;
}

export const profileService = {
    /**
     * Get current user profile
     */
    async getProfile(): Promise<{ ok: boolean; data: UserProfile }> {
        const { data } = await api('/api/profile', { method: 'GET' });
        return data;
    },

    /**
     * Update user profile
     */
    async updateProfile(updates: Partial<UserProfile>): Promise<{ ok: boolean; data: UserProfile }> {
        const { data } = await api('/api/profile', {
            method: 'PATCH', // Fixed: Backend expects PATCH, not POST
            body: JSON.stringify(updates),
        });
        return data;
    },

    /**
     * Update forwarding address
     * Note: Backend endpoint /api/profile/address does NOT exist
     * Using PATCH /api/profile instead
     */
    async updateForwardingAddress(address: string): Promise<{ ok: boolean; forwarding_address: string }> {
        const { data } = await api('/api/profile', {
            method: 'PATCH', // Fixed: Use PATCH /api/profile with forwarding_address field
            body: JSON.stringify({ forwarding_address: address }),
        });
        return data;
    },

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<{ ok: boolean; debug_token?: string }> {
        const { data } = await api('/api/profile/reset-password-request', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        return data;
    },

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
        const { data } = await api('/api/auth/reset-password/confirm', { // Fixed: Backend endpoint is in /api/auth, not /api/profile
            method: 'POST',
            body: JSON.stringify({ token, password: newPassword }),
        });
        return data;
    },
};
