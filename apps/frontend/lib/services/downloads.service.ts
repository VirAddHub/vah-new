// lib/services/downloads.service.ts
// Downloads API service

import { api } from '../api';

export interface Download {
    id: number;
    user_id: number;
    file_id: number;
    download_url: string;
    expires_at: number;
    created_at: string;
}

export const downloadsService = {
    /**
     * Get download history
     */
    async getDownloads(): Promise<{ ok: boolean; data: Download[] }> {
        const { data } = await api('/api/downloads', { method: 'GET' });
        return data;
    },

    /**
     * Create download link
     */
    async createDownloadLink(fileId: number): Promise<{ ok: boolean; data: Download }> {
        const { data } = await api('/api/downloads', {
            method: 'POST',
            body: JSON.stringify({ file_id: fileId }),
        });
        return data;
    },
};
