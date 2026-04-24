'use client';

import { tokenManager } from './token-manager';
// import { isOk, ApiErr } from './apiClient'; // TODO: implement usage

// Client-side Auth Manager (no React hooks, just client-side utilities)
export type User = {
  id: string;
  email: string;
  role?: 'admin' | 'user';
  name?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  /** Optional – present after KYC calls */
  kyc_status?: string; // 'pending' | 'approved' | 'rejected' | string
};

// API user shape (what backend returns)
export interface ApiUser {
  user_id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  role?: string;
  kyc_status?: string;
}

// Type guard to check if object is ApiUser
export function isApiUser(obj: any): obj is ApiUser {
  return obj && typeof obj === 'object' &&
    typeof obj.user_id === 'string' &&
    typeof obj.email === 'string';
}

// Map API user -> Client user (storage)
export function toClientUser(u: ApiUser): User {
  const role = (u.role === 'admin' || u.role === 'user') ? (u.role as 'admin' | 'user') : undefined;
  return {
    id: u.user_id,
    email: u.email,
    name: u.name,
    first_name: u.first_name,
    last_name: u.last_name,
    is_admin: u.is_admin,
    role,
    kyc_status: u.kyc_status
  };
}

export class ClientAuthManager {
  private token: string | null = null;
  private user: User | null = null;
  private _inFlight: boolean = false; // ✅ Prevent simultaneous /whoami calls
  private _initialized: boolean = false; // ✅ Ensure first-time check logic runs only once

  // apps/frontend/lib/client-auth.ts
  // ... imports

  constructor() {
    // Auth is now cookie-based. No client-side token storage.
  }

  isAuthenticated(): boolean {
    return !!this.user;
  }
  getUser(): User | null {
    return this.user;
  }

  isAdmin(): boolean {
    return this.user?.is_admin || this.user?.role === 'admin' || false;
  }

  setUser(user: User) {
    this.user = user;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearAuth() {
    this.token = null;
    this.user = null;
  }

  async checkAuth() {
    // 🛑 GUARD CLAUSE: Prevent multiple simultaneous auth checks
    if (this._inFlight) {
      console.log('Auth check already in progress, skipping...');
      return this.user; // Return cached user data
    }

    this._inFlight = true;
    try {
      console.log('Checking auth via BFF whoami...');
      // Use same-origin BFF route so HttpOnly cookies are sent correctly
      const res = await fetch('/api/bff/auth/whoami', { credentials: 'include' });

      if (!res.ok) {
        this.clearAuth();
        throw new Error(`Auth failed (${res.status})`);
      }

      const json = await res.json().catch(() => null);
      const raw = json?.data?.user ?? json?.data ?? json?.user ?? null;

      if (!raw || (!raw.id && !raw.user_id)) {
        this.clearAuth();
        throw new Error('Auth failed: no user data');
      }

      const userData: User = {
        id: String(raw.user_id ?? raw.id),
        email: raw.email || '',
        first_name: raw.first_name,
        last_name: raw.last_name,
        is_admin: !!raw.is_admin,
        role: raw.role === 'admin' ? 'admin' : 'user',
        kyc_status: raw.kyc_status,
      };

      this.setUser(userData);
      this._initialized = true;
      return userData;
    } catch (error) {
      console.error('Auth check failed:', error);
      this.clearAuth();
      throw error;
    } finally {
      this._inFlight = false;
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
