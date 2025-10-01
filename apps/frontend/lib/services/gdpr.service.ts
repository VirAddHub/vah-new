// lib/services/gdpr.service.ts
// GDPR data export API service

import { api } from '../api';

export const gdprService = {
    /**
     * Request GDPR data export
     */
    async requestExport(): Promise<{ ok: boolean; export_id: string; message: string }> {
        const { data } = await api('/api/gdpr-export', {
            method: 'POST',
        });
        return data;
    },

    /**
     * Get export status
     */
    async getExportStatus(exportId: string): Promise<{ ok: boolean; status: string; download_url?: string }> {
        const { data } = await api(`/api/gdpr-export/${exportId}`, { method: 'GET' });
        return data;
    },
};
