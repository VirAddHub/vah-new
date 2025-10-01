// lib/services/files.service.ts
// File management API service

import { api } from '../api';

export interface FileItem {
    id: number;
    user_id: number;
    mail_item_id?: number;
    name: string;
    path: string;
    size: number;
    mime: string;
    etag?: string;
    web_url?: string;
    share_url?: string;
    share_expires_at?: number;
    deleted: boolean;
    created_at: string;
    updated_at: string;
}

export const filesService = {
    /**
     * Get all files for current user
     */
    async getFiles(params?: {
        mail_item_id?: number;
        deleted?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{ ok: boolean; items: FileItem[]; limit: number; offset: number }> {
        const queryParams = new URLSearchParams();
        if (params?.mail_item_id) queryParams.append('mail_item_id', params.mail_item_id.toString());
        if (params?.deleted !== undefined) queryParams.append('deleted', params.deleted ? '1' : '0');
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());

        const { data } = await api(`/api/files?${queryParams.toString()}`, { method: 'GET' });
        return data;
    },

    /**
     * Get signed download URL for a file
     */
    async getSignedUrl(id: number): Promise<{ ok: boolean; url: string; expires_at: number; cached: boolean }> {
        const { data } = await api(`/api/files/${id}/signed-url`, { method: 'POST' });
        return data;
    },
};
