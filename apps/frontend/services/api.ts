import { apiClient } from '../lib/apiClient';

export const mailApi = {
  async getMailItem(id: string) {
    try {
      const response = await apiClient.get(`/mail-items/${id}`);
      return {
        success: response.ok,
        data: response.data,
        error: response.ok ? null : response.data?.error || 'Failed to fetch mail item'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to fetch mail item'
      };
    }
  },

  async markAsRead(id: string) {
    try {
      const response = await apiClient.patch(`/mail-items/${id}`, { is_read: true });
      return {
        success: response.ok,
        data: response.data,
        error: response.ok ? null : response.data?.error || 'Failed to mark as read'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to mark as read'
      };
    }
  },

  async downloadScan(id: string) {
    try {
      const response = await apiClient.get(`/mail-items/${id}/scan-url`);
      if (response.ok && response.data?.url) {
        const blobResponse = await fetch(response.data.url);
        return await blobResponse.blob();
      } else {
        throw new Error('No download URL available');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to download scan');
    }
  }
};
