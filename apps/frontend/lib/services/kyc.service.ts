// lib/services/kyc.service.ts
// KYC verification API service

import { api } from '../api';

export interface KYCStatus {
    ok: boolean;
    data: {
        status: 'pending' | 'approved' | 'rejected' | 'not_started';
        review_result?: string;
        submitted_at?: string;
        reviewed_at?: string;
    };
}

export const kycService = {
    /**
     * Start KYC verification process
     */
    async startKyc(): Promise<{ ok: boolean; token?: string; applicant_id?: string; status?: string; message?: string }> {
        const { data } = await api('/api/bff/kyc/start', {
            method: 'POST',
        });
        return data;
    },

    /**
     * Upload KYC documents
     */
    async uploadDocuments(formData: FormData): Promise<{ ok: boolean; data: { sdk_token: string } }> {
        const { data } = await api('/api/kyc/upload-documents', { // Fixed: Backend endpoint is /api/kyc/upload-documents, not /api/kyc/upload
            method: 'POST',
            body: formData,
        });
        return data;
    },

    /**
     * Get KYC verification status
     */
    async getStatus(): Promise<KYCStatus> {
        const { data } = await api('/api/kyc/status', { method: 'GET' });
        return data;
    },
};
