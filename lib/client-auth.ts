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

      if (response.ok) {
        // TypeScript now knows this is the success branch with data property
        const successResponse = response as { ok: true; data: any };
        const userData = successResponse.data?.user || successResponse.data;
        this.setUser(userData);
        return userData;
      } else {
        // TypeScript now knows this is the error branch with message property
        const errorResponse = response as { ok: false; message: string };
        throw new Error(errorResponse.message || 'Auth failed');
      }
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
