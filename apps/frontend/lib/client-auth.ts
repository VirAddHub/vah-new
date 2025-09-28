'use client';

import { apiClient, ApiResponse } from './apiClient';
// import { isOk, ApiErr } from './apiClient'; // TODO: implement usage

// Client-side Auth Manager (no React hooks, just client-side utilities)
export type User = {
  id: string;
  email: string;
  role?: 'admin' | 'user';
  name?: string;
  is_admin?: boolean;
};

export class ClientAuthManager {
  private token: string | null = null;
  private user: User | null = null;
  private _inFlight: boolean = false; // ✅ Prevent simultaneous /whoami calls
  private _initialized: boolean = false; // ✅ Ensure first-time check logic runs only once

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

  setUser(user: User) {
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
    // 🛑 GUARD CLAUSE: Prevent multiple simultaneous auth checks
    if (this._inFlight) {
      console.log('Auth check already in progress, skipping...');
      return this.user; // Return cached user data
    }

    this._inFlight = true;
    try {
      console.log('Checking auth with API client...');
      const response: ApiResponse<unknown> = await apiClient.get('/api/auth/whoami');
      console.log('Auth check response:', response);

      if (response.ok && 'data' in response) {
        // ✅ SUCCESS CASE: TypeScript now knows this is ApiOk<T> branch
        const successResponse = response as { ok: true; data: unknown };
        const payload = successResponse.data;
        const userData = (payload && typeof payload === 'object' && 'user' in payload)
          ? (payload as { user: User }).user
          : payload as User;
        this.setUser(userData);
        this._initialized = true; // ✅ Mark as initialized
        return userData;
      }

      // ✅ ERROR CASE: TypeScript now knows this is ApiErr branch
      const errorResponse = response as { ok: false; message: string };
      const msg = errorResponse.message || 'Auth failed';
      console.error('Whoami check failed:', msg);
      this.clearAuth();
      throw new Error(msg);
    } catch (error) {
      console.error('Auth check failed:', error);
      this.clearAuth();
      throw error;
    } finally {
      this._inFlight = false; // ✅ Always reset the flag
    }
  }

  // ✅ Getter for initialization status
  get initialized(): boolean {
    return this._initialized;
  }

  // ✅ Method to mark as initialized (useful for fresh login scenarios)
  markInitialized(): void {
    this._initialized = true;
  }
}

// Create singleton instance for client-side use
export const clientAuthManager = new ClientAuthManager();
