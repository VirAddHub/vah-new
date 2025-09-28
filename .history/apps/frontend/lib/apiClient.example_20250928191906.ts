// Example usage of the API client
import { fetchJson } from './apiClient';

// Example: Get user profile
export async function getCurrentUser() {
    try {
        const response = await fetchJson<{
            ok: boolean;
            data: { user: { id: number; email: string; name: string; roles: string[] } };
        }>('/api/me');
        return response;
    } catch (error) {
        console.error('Failed to get current user:', error);
        throw error;
    }
}

// Example: Update user profile
export async function updateUserProfile(updates: {
    name?: string;
    avatarUrl?: string;
    marketingOptIn?: boolean;
}) {
    try {
        const response = await fetchJson<{
            ok: boolean;
            data: { user: any };
        }>('/api/me/profile', {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
        return response;
    } catch (error) {
        console.error('Failed to update user profile:', error);
        throw error;
    }
}

// Example: Health check
export async function checkHealth() {
    try {
        const response = await fetchJson<string>('/healthz');
        return response;
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

// Example: Get ready status
export async function checkReady() {
    try {
        const response = await fetchJson<{ status: string }>('/ready');
        return response;
    } catch (error) {
        console.error('Ready check failed:', error);
        throw error;
    }
}
