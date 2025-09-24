// API Client
export class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
        this.token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
        }
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async get(url: string, options: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: 'GET',
            headers: this.getHeaders(),
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async post(url: string, data?: any, options: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async put(url: string, data?: any, options: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async delete(url: string, options: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Auth Manager
export class AuthManager {
    private token: string | null = null;
    private user: any = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
            this.user = JSON.parse(localStorage.getItem('user') || 'null');
        }
    }

    isAuthenticated(): boolean {
        return !!this.token;
    }

    isAdmin(): boolean {
        return this.user?.is_admin || false;
    }

    getUser() {
        return this.user;
    }

    setUser(user: any) {
        this.user = user;
        if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user));
        }
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        }
    }

    async checkAuth() {
        try {
            const response = await apiClient.get('/api/auth/whoami');
            this.setUser(response.user);
            return response.user;
        } catch (error) {
            this.clearAuth();
            throw error;
        }
    }
}

// Create singleton instance
export const authManager = new AuthManager();

// Audit Logging Functions
export async function logClientEvent(event: string, data?: any) {
    try {
        await apiClient.post('/api/audit/client-event', {
            event,
            data,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
            url: typeof window !== 'undefined' ? window.location.href : 'server'
        });
    } catch (error) {
        console.error('Failed to log client event:', error);
    }
}

export async function logUserAction(action: string, data?: any) {
    try {
        await apiClient.post('/api/audit/user-action', {
            action,
            data,
            timestamp: new Date().toISOString(),
            userId: authManager.getUser()?.id
        });
    } catch (error) {
        console.error('Failed to log user action:', error);
    }
}

export async function logAdminAction(action: string, data?: any) {
    try {
        await apiClient.post('/api/audit/admin-action', {
            action,
            data,
            timestamp: new Date().toISOString(),
            adminId: authManager.getUser()?.id
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}

export async function logAuthEvent(event: string, data?: any) {
    try {
        await apiClient.post('/api/audit/auth-event', {
            event,
            data,
            timestamp: new Date().toISOString(),
            userId: authManager.getUser()?.id
        });
    } catch (error) {
        console.error('Failed to log auth event:', error);
    }
}

export async function logMailEvent(event: string, data?: any) {
    try {
        await apiClient.post('/api/audit/mail-event', {
            event,
            data,
            timestamp: new Date().toISOString(),
            userId: authManager.getUser()?.id
        });
    } catch (error) {
        console.error('Failed to log mail event:', error);
    }
}

// Validation utilities
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// File utilities
export const fileUtils = {
    safeFilename: (filename: string): string => {
        return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    },

    formatFileSize: (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileExtension: (filename: string): string => {
        return filename.split('.').pop()?.toLowerCase() || '';
    }
};

// Storage utilities
export const storage = {
    upload: async (file: File, path: string): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);

        const response = await apiClient.post('/api/storage/upload', formData);
        return response.url;
    },

    download: async (url: string): Promise<Blob> => {
        const response = await fetch(url);
        return response.blob();
    }
};

// Custom hook for API data fetching
export function useApiData(url: string) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await apiClient.get(url);
            setData(result);
        } catch (err) {
            setError(err as any);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [url]);

    const refetch = () => {
        fetchData();
    };

    return { data, isLoading, error, refetch };
}

// Import React hooks
import { useState, useEffect } from 'react';
