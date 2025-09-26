// lib/client-auth.ts - Client-side auth management to prevent loops
import { ApiResponse, isOk } from './api-client';

let authInitialized = false;
let whoamiInFlight: Promise<any> | null = null;
let currentUser: any = null;

export async function checkAuthOnce(api: { get: <T>(p: string) => Promise<ApiResponse<T>> }) {
    if (whoamiInFlight) return whoamiInFlight;
    whoamiInFlight = (async () => {
        const resp = await api.get<any>('/api/auth/whoami');
        if (isOk(resp)) {
            return resp.data?.user ?? resp.data;
        }
        throw new Error(resp.message || 'Auth failed');
    })();
    try { return await whoamiInFlight; }
    finally { whoamiInFlight = null; }
}

export function clearAuth() {
    authInitialized = false;
    whoamiInFlight = null;
    currentUser = null;
}

export function getCurrentUser() {
    return currentUser;
}

export function isAuthInitialized() {
    return authInitialized;
}

// Prevent double form submissions
let submitting = false;

export function preventDoubleSubmit<T extends (...args: any[]) => Promise<any>>(
    fn: T
): T {
    return (async (...args: any[]) => {
        if (submitting) {
            console.warn('Preventing double submit');
            return;
        }

        submitting = true;
        try {
            return await fn(...args);
        } finally {
            submitting = false;
        }
    }) as T;
}
