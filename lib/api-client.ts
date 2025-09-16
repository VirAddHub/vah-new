import { z } from 'zod';

// API Response schemas
const ApiErrorSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    statusCode: z.number().optional(),
});

const ApiResponseSchema = z.object({
    ok: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
});

// Type definitions
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResponse<T = any> = {
    ok: boolean;
    data?: T;
    error?: string;
};

// Custom error class
export class ApiClientError extends Error {
    constructor(
        public message: string,
        public statusCode?: number,
        public response?: Response
    ) {
        super(message);
        this.name = 'ApiClientError';
    }
}

// API Client class
export class ApiClient {
    private baseUrl: string;
    private defaultHeaders: HeadersInit;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const config: RequestInit = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new ApiClientError(
                    errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    response
                );
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (error instanceof ApiClientError) {
                throw error;
            }

            // Network or parsing error
            throw new ApiClientError(
                error instanceof Error ? error.message : 'Unknown error occurred',
                0
            );
        }
    }

    // GET request
    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'GET',
        });
    }

    // POST request
    async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // PUT request
    async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // DELETE request
    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'DELETE',
        });
    }

    // PATCH request
    async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // Set authentication token
    setAuthToken(token: string) {
        const headers: Record<string, string> = {
            ...(this.defaultHeaders as Record<string, string>),
            Authorization: `Bearer ${token}`,
        };
        this.defaultHeaders = headers;
    }

    // Clear authentication token
    clearAuthToken() {
        const { Authorization, ...headers } = this.defaultHeaders as Record<string, string>;
        this.defaultHeaders = headers;
    }
}

// Create default instance
export const apiClient = new ApiClient();

// API endpoints
export const API_ENDPOINTS = {
    // Authentication
    auth: {
        login: '/auth/login',
        logout: '/auth/logout',
        whoami: '/auth/whoami',
        csrf: '/auth/csrf',
        resetRequest: '/auth/reset-request',
        resetConfirm: '/auth/reset-confirm',
    },

    // Mail
    mail: {
        list: '/mail',
        get: (id: string) => `/mail/${id}`,
        scan: '/mail/scan',
        bulkMarkRead: '/mail/bulk/mark-read',
        search: '/mail/search',
    },

    // Invoices
    invoices: {
        list: '/invoices',
        get: (id: string) => `/invoices/${id}`,
        download: (token: string) => `/invoices/${token}`,
    },

    // Profile
    profile: {
        get: '/profile',
        update: '/profile',
        certificate: '/profile/certificate',
    },

    // Admin
    admin: {
        mailItems: '/admin/mail-items',
        plans: '/admin/plans',
        support: '/admin/support',
        invoices: '/admin/invoices',
    },

    // Health
    health: {
        ready: '/ready',
        healthz: '/healthz',
    },
} as const;

// Utility function to handle API errors
export function handleApiError(error: unknown): string {
    if (error instanceof ApiClientError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An unexpected error occurred';
}
