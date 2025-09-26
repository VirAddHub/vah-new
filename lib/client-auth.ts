'use client';

import { apiClient } from './api-client';

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
    // 🛑 GUARD CLAUSE: Prevent multiple simultaneous auth checks
    if (this.checkingAuth) {
      console.log('Auth check already in progress, skipping...');
      return this.user; // Return cached user data
    }

    this.checkingAuth = true;
    try {
      console.log('Checking auth with API client...');
      const response = await apiClient.get('/api/auth/whoami');
      console.log('Auth check response:', response);
      if (response.ok && response.data) {
        const userData = response.data?.user || response.data;
        this.setUser(userData);
        return userData;
      }
      throw new Error('No user data received');
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
