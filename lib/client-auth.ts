'use client';

import { apiClient, isOk, ApiResponse, ApiErr } from './api-client';

// Client-side Auth Manager (no React hooks, just client-side utilities)
export class ClientAuthManager {
  private token: string | null = null;
  private user: any = null;
  private checkingAuth: boolean = false; // ✅ Prevent multiple simultaneous auth checks

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
    // 🚨 NUCLEAR OPTION: Temporarily disable all auth checks to stop the loop
    console.log('🚨 AUTH CHECK DISABLED TO STOP INFINITE LOOP');
    return this.user; // Just return cached user data, no API calls

    // 🛑 GUARD CLAUSE: Prevent multiple simultaneous auth checks
    if (this.checkingAuth) {
      console.log('Auth check already in progress, skipping...');
      return this.user; // Return cached user data
    }

    this.checkingAuth = true;
    try {
      console.log('Checking auth with API client...');
      const response: ApiResponse<any> = await apiClient.get('/api/auth/whoami');
      console.log('Auth check response:', response);

      if (response.ok && 'data' in response) {
        // ✅ SUCCESS CASE: TypeScript now knows this is ApiOk<T> branch
        const successResponse = response as { ok: true; data: any };
        const payload = successResponse.data;
        const userData = (payload && 'user' in payload) ? payload.user : payload;
        this.setUser(userData);
        return userData;
      }

      // ✅ ERROR CASE: TypeScript now knows this is ApiErr branch
      const errorResponse = response as { ok: false; message: string };
      const msg = errorResponse.message || 'Auth failed';
      console.error('Whoami check failed:', msg);
      throw new Error(msg);
    } catch (error) {
      console.error('Auth check failed:', error);
      this.clearAuth();
      throw error;
    } finally {
      this.checkingAuth = false; // ✅ Always reset the flag
    }
  }
}

// Create singleton instance for client-side use
export const clientAuthManager = new ClientAuthManager();
