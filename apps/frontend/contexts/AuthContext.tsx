"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getErrorMessage, getErrorStack } from '../lib/errors';
import { clientAuthManager, isApiUser, toClientUser } from '../lib/client-auth';
import { setToken, setStoredUser } from '../lib/token-manager';
import { tokenManager } from '../lib/token-manager';
import { api as apiClient } from '../lib/http';
import type { ApiUser } from '../types/user';
import type { User as ClientUser } from '../lib/client-auth';

type AuthStatus = 'loading' | 'authed' | 'guest';


// Client-safe logging functions
const logAuthEvent = async (event: string, data?: any) => {
    try {
        await apiClient.post('/api/audit/auth-event', {
            event,
            data,
            timestamp: new Date().toISOString(),
            userId: clientAuthManager.getUser()?.id
        });
    } catch (error) {
        console.error('Failed to log auth event:', error);
    }
};

const logAdminAction = async (action: string, data?: any) => {
    try {
        await apiClient.post('/api/audit/admin-action', {
            action,
            data,
            timestamp: new Date().toISOString(),
            adminId: clientAuthManager.getUser()?.id
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
};

interface User {
    id: string | number;
    email: string;
    name?: string;
    is_admin?: boolean | 0 | 1;
    role?: string;
    kyc_status?: string;
    plan_status?: string;
    plan?: string;
    created_at?: string;
    last_login?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
    loading: boolean;
    status: AuthStatus;
    token?: string | null;           // ← add (optional to avoid breaking older imports)
    getToken?: () => string | null;  // keep if you have it
    login: (credentials: { email: string; password: string }) => Promise<void>;
    adminLogin: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authInitialized, setAuthInitialized] = useState(false); // ✅ Guard against re-initialization
    const [status, setStatus] = useState<AuthStatus>('loading');
    const ranOnceRef = useRef(false);

    const hasUser = !!user;
    const isAdmin =
        Boolean(user?.is_admin) ||
        (typeof user?.role === "string" && user.role.toLowerCase() === "admin");

    // Initialize auth state on mount - ONLY ONCE
    useEffect(() => {
        if (ranOnceRef.current) return;
        ranOnceRef.current = true;
        (async () => {
            try {
                // With HttpOnly cookies, the BFF route forwards the cookie server-side.
                // Always use the same-origin BFF route so HttpOnly cookies are included.
                const res = await fetch('/api/bff/auth/whoami', {
                    credentials: 'include',
                });
                console.log('🔍 AuthContext Init - Whoami response status:', res.status, res.ok);
                if (!res.ok) {
                    console.log('🔍 AuthContext Init - Whoami failed, clearing token and setting guest status');
                    tokenManager.clear();
                    setUser(null as any);
                    setStatus('guest');
                    setIsLoading(false);
                    setAuthInitialized(true);
                    return;
                }
                const json = await res.json();
                console.log('🔍 AuthContext Init - Whoami response:', json);

                // Accept both shapes:
                // A) { ok: true, data: { id, email, ... } } - user fields directly in data
                // B) { ok: true, data: { user: { id, email, ... } } } - user nested in data.user
                // C) { ok: true, user: { id, email, ... } } - user at top level (legacy)
                const userData =
                    (json?.data && typeof json.data === 'object' && 'id' in json.data ? json.data : null) ??
                    (json?.data?.user && typeof json.data.user === 'object' ? json.data.user : null) ??
                    (json?.user && typeof json.user === 'object' ? json.user : null);

                if (!userData) {
                    console.warn('❌ AuthContext Init - No user data in response. Response shape:', json);
                    setUser(null as any);
                    setStatus('guest');
                    setIsLoading(false);
                    setAuthInitialized(true);
                    return;
                }

                // Extract ID - handle both user_id and id fields
                const userId = userData.user_id ?? userData.id;
                if (!userId) {
                    console.warn('❌ AuthContext Init - User data missing ID field. User data:', userData);
                    setUser(null as any);
                    setStatus('guest');
                    setIsLoading(false);
                    setAuthInitialized(true);
                    return;
                }

                // shape-normalise minimal fields used in UI
                const clientUser = {
                    id: String(userId),
                    email: userData.email || '',
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    is_admin: !!userData.is_admin,
                    role: userData.role === 'admin' ? 'admin' : 'user',
                    plan_status: userData.plan_status,
                    kyc_status: userData.kyc_status,
                };

                // Only log success if we have a valid user with ID
                if (clientUser.id && clientUser.id !== '') {
                    console.log('✅ AuthContext Init - User authenticated:', clientUser);
                    setUser(clientUser as any);
                    setStatus('authed');
                } else {
                    console.warn('❌ AuthContext Init - User ID is empty after parsing:', clientUser);
                    setUser(null as any);
                    setStatus('guest');
                }
                setIsLoading(false);
                setAuthInitialized(true);
            } catch (e) {
                setUser(null as any);
                setStatus('guest');
                setIsLoading(false);
                setAuthInitialized(true);
            }
        })();
    }, []);

    const login = async (credentials: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            await logAuthEvent('user_login_attempt', { email: credentials.email });

            // Use same-origin BFF route so HttpOnly cookies are set correctly
            const res = await fetch('/api/bff/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: credentials.email, password: credentials.password }),
            });
            const json = await res.json().catch(() => null);

            if (!res.ok || !json?.ok) {
                const errorMessage = json?.error || json?.message || 'Login failed';
                throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Login failed');
            }

            // Normalise user from response - handle both { data: { user } } and { data: { id, email } }
            const rawUser = json?.data?.user ?? json?.data ?? {};
            const apiUser: ApiUser = {
                user_id: String(rawUser?.user_id ?? rawUser?.id ?? ''),
                email: String(rawUser?.email ?? ''),
                first_name: rawUser?.first_name,
                last_name: rawUser?.last_name,
                is_admin: !!(rawUser?.is_admin),
                role: rawUser?.role ?? 'user',
                kyc_status: rawUser?.kyc_status,
            };
            const clientUser = toClientUser(apiUser);
            clientAuthManager.setUser(clientUser);
            setUser(clientUser as any);
            setStatus('authed');

            if (json?.data?.token) {
                setToken(json.data.token);
            }
            setStoredUser(clientUser);

            await logAuthEvent('user_login_success', {
                email: credentials.email,
                userId: apiUser.user_id
            });

            console.log('User is authenticated. Redirecting to /mail');
            window.location.href = '/mail';
        } catch (error: any) {
            await logAuthEvent('user_login_failed', {
                email: credentials.email,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const adminLogin = async (credentials: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            await logAuthEvent('admin_login_attempt', { email: credentials.email });

            // Use same-origin BFF route so HttpOnly cookies are set correctly
            const res = await fetch('/api/bff/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: credentials.email, password: credentials.password }),
            });
            const json = await res.json().catch(() => null);

            if (!res.ok || !json?.ok) {
                throw new Error('Admin access required');
            }

            const rawUser = json?.data?.user ?? json?.data ?? {};
            const apiUser: ApiUser = {
                user_id: String(rawUser?.user_id ?? rawUser?.id ?? ''),
                email: String(rawUser?.email ?? ''),
                first_name: rawUser?.first_name,
                last_name: rawUser?.last_name,
                is_admin: !!(rawUser?.is_admin),
                role: rawUser?.role ?? 'user',
                kyc_status: rawUser?.kyc_status,
            };

            if (!apiUser.is_admin) {
                throw new Error('Admin access required');
            }

            const clientUser = toClientUser(apiUser);
            clientAuthManager.setUser(clientUser);
            setUser(clientUser as any);
            setStatus('authed');

            if (json?.data?.token) {
                setToken(json.data.token);
            }
            setStoredUser(clientUser);

            await logAuthEvent('admin_login_success', {
                email: credentials.email,
                adminId: apiUser.user_id
            });
            await logAdminAction('admin_login', {
                email: credentials.email,
                adminId: apiUser.user_id
            });
        } catch (error: any) {
            await logAuthEvent('admin_login_failed', {
                email: credentials.email,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            if (user?.is_admin) {
                await logAdminAction('admin_logout', { adminId: user.id });
            } else {
                await logAuthEvent('user_logout', { userId: user?.id });
            }

            // Use same-origin BFF route so HttpOnly cookies are properly cleared
            await fetch('/api/bff/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            clientAuthManager.clearAuth();
            tokenManager.clear();
            setUser(null);
            setStatus('guest');
            setIsLoading(false);
        }
    };


    const refreshUser = async () => {
        // 🛑 GUARD CLAUSE: Don't refresh if we're already loading or not initialized
        if (isLoading || !authInitialized) return;

        try {
            // Use same-origin BFF route so HttpOnly cookies are included
            const res = await fetch('/api/bff/auth/whoami', { credentials: 'include' });
            if (!res.ok) {
                clientAuthManager.clearAuth();
                setUser(null);
                setStatus('guest');
                return;
            }
            const json = await res.json().catch(() => null);
            const raw = json?.data?.user ?? json?.data ?? json?.user ?? null;
            if (!raw?.id && !raw?.user_id) {
                clientAuthManager.clearAuth();
                setUser(null);
                setStatus('guest');
                return;
            }
            const updated = {
                id: String(raw.user_id ?? raw.id),
                email: raw.email || '',
                first_name: raw.first_name,
                last_name: raw.last_name,
                is_admin: !!raw.is_admin,
                role: raw.role === 'admin' ? 'admin' : 'user',
                plan_status: raw.plan_status,
                kyc_status: raw.kyc_status,
            };
            clientAuthManager.setUser(updated as any);
            setUser(updated as any);
        } catch (error) {
            console.error('Failed to refresh user data:', error);
            clientAuthManager.clearAuth();
            setUser(null);
        }
    };

    /// NOTE: Do not declare another `isAuthenticated` from user here.
    /// `isAuthenticated` below is derived from `status` and is the single source of truth.
    const loading = status === 'loading';
    const isAuthenticated = status === 'authed';

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        loading,
        status,
        token: tokenManager.get(),                           // ← ensure provided
        getToken: () => tokenManager.get(),                  // keep if you had it
        login,
        adminLogin,
        logout,
        refreshUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
