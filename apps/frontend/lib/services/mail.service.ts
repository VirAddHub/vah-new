// TEMP SHIM — deprecate this file after migration.
// Re-export from the unified client to keep legacy imports working.
import { mailApi } from '../apiClient';

export const getMailItems = () => mailApi.list();
export const getMailItem = (id: string) => mailApi.get(id);
export const updateMailItem = (id: string, _data: any) => mailApi.get(id);
export const getScanUrl = async (id: string) => {
    // return an object for legacy callers; prefer mailApi.downloadScan for Blob
    try {
        const blob = await mailApi.downloadScan(id);
        return { ok: true, url: URL.createObjectURL(blob) };
    } catch (error) {
        return { ok: false, url: '', error: error.message };
    }
};

// Legacy interface exports for backward compatibility
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
    expires_at?: number;
    error?: string;
}

export const mailService = {
    getMailItems,
    getMailItem,
    updateMailItem,
    getScanUrl,
};