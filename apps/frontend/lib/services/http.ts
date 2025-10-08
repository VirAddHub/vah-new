import axios from 'axios';

// Create a single axios instance with proper configuration
export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? 'https://vah-api-staging.onrender.com',
  withCredentials: true, // Critical for cookies across domains
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for logging
http.interceptors.request.use(
  (config) => {
    console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[HTTP] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
http.interceptors.response.use(
  (response) => {
    console.log(`[HTTP] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[HTTP] Response error:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

// SWR/React Query fetcher that ALWAYS includes credentials
export const swrFetcher = (url: string) =>
  http.get(url, { withCredentials: true }).then(r => r.data);

// Generic API functions
export const apiGet = async (path: string) => {
  const response = await http.get(path);
  return response.data;
};

export const apiPost = async (path: string, data: any) => {
  const response = await http.post(path, data);
  return response.data;
};

export const apiPatch = async (path: string, data: any) => {
  const response = await http.patch(path, data);
  return response.data;
};

export const apiDelete = async (path: string) => {
  const response = await http.delete(path);
  return response.data;
};

// Admin-specific API functions
export const adminApi = {
  getForwardingRequests: (params: { limit?: number; offset?: number; status?: string; q?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.q) searchParams.set('q', params.q);
    
    const url = `/api/admin/forwarding/requests${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return apiGet(url);
  },

  updateForwardingRequest: (id: number, data: any) => {
    return apiPatch(`/api/admin/forwarding/requests/${id}`, data);
  },

  getMailItems: (params: { status?: string; q?: string; tag?: string; page?: number; page_size?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.q) searchParams.set('q', params.q);
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.page_size) searchParams.set('page_size', params.page_size.toString());
    
    const url = `/api/admin/mail-items${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return apiGet(url);
  },

  getUsers: (params: { page?: number; pageSize?: number; search?: string; status?: string; plan_id?: string; kyc_status?: string; activity?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.plan_id) searchParams.set('plan_id', params.plan_id);
    if (params.kyc_status) searchParams.set('kyc_status', params.kyc_status);
    if (params.activity) searchParams.set('activity', params.activity);
    
    const url = `/api/admin/users${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return apiGet(url);
  }
};
