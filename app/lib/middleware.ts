// app/lib/middleware.ts
// Frontend middleware utilities - synced from backend concepts

/**
 * Rate limiting utility for frontend API calls
 */
export class RateLimiter {
    private buckets = new Map<string, number[]>();
    private windowMs: number;
    private max: number;

    constructor(windowMs = 60000, max = 60) {
        this.windowMs = windowMs;
        this.max = max;
    }

    isAllowed(key: string): boolean {
        const now = Date.now();
        const bucket = this.buckets.get(key) || [];
        const recent = bucket.filter(ts => now - ts < this.windowMs);
        recent.push(now);
        this.buckets.set(key, recent);
        return recent.length <= this.max;
    }

    getRemainingRequests(key: string): number {
        const now = Date.now();
        const bucket = this.buckets.get(key) || [];
        const recent = bucket.filter(ts => now - ts < this.windowMs);
        return Math.max(0, this.max - recent.length);
    }
}

/**
 * CSRF token management for frontend
 */
export class CSRFManager {
    private token: string | null = null;
    private tokenExpiry: number = 0;

    async getToken(): Promise<string> {
        if (this.token && Date.now() < this.tokenExpiry) {
            return this.token!;
        }

        try {
            const response = await fetch('/api/auth/csrf', {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to get CSRF token');
            }

            const data = await response.json();
            this.token = data.token;
            this.tokenExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes
            return this.token!;
        } catch (error) {
            console.error('CSRF token error:', error);
            throw error;
        }
    }

    async requestWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
        const token = await this.getToken();

        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'X-CSRF-Token': token,
            },
            credentials: 'include',
        });
    }
}

/**
 * Authentication state manager
 */
export class AuthManager {
    private user: any = null;
    private listeners: Array<(user: any) => void> = [];

    async checkAuth(): Promise<any> {
        try {
            const response = await fetch('/api/auth/whoami', {
                credentials: 'include',
            });

            if (response.ok) {
                this.user = await response.json();
            } else {
                this.user = null;
            }
        } catch (error) {
            this.user = null;
        }

        this.notifyListeners();
        return this.user;
    }

    getUser(): any {
        return this.user;
    }

    isAuthenticated(): boolean {
        return !!this.user;
    }

    isAdmin(): boolean {
        return this.user?.role === 'admin' || this.user?.is_admin === 1;
    }

    subscribe(listener: (user: any) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.user));
    }
}

// Export singleton instances
export const rateLimiter = new RateLimiter();
export const csrfManager = new CSRFManager();
export const authManager = new AuthManager();
