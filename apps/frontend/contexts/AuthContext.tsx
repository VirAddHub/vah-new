"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getErrorMessage, getErrorStack } from '../lib/errors';
import { apiClient } from '../lib/apiClient';
import { AuthAPI } from '../lib/api-client';
import { clientAuthManager, isApiUser, toClientUser } from '../lib/client-auth';
import { authGuard } from '../lib/auth-guard';
import { parseJSONSafe } from '../lib/parse-json-safe';
import { getToken, setToken, getStoredUser, setStoredUser } from '../lib/token-manager';
import { tokenManager } from '../lib/token-manager';
import { apiUrl } from '../lib/api-url';
import type { ApiUser, WhoAmI, Role } from '../types/user';
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
    const isAdmin = Boolean(user?.is_admin);

    // Initialize auth state on mount - ONLY ONCE
    useEffect(() => {
        if (ranOnceRef.current) return;
        ranOnceRef.current = true;
        (async () => {
            try {
                const token = tokenManager.get();
                console.log('🔍 AuthContext Init - Token exists:', !!token);
                if (!token) {
                    console.log('🔍 AuthContext Init - No token, setting guest status');
                    setUser(null as any);
                    setStatus('guest');
                    setIsLoading(false);
                    setAuthInitialized(true);
                    return;
                }
                console.log('🔍 AuthContext Init - Making whoami call with token:', token.substring(0, 20) + '...');
                const res = await fetch(apiUrl('auth/whoami'), {
                    headers: { Authorization: `Bearer ${token}` },
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

                // Backend returns: { ok: true, data: { user_id, email, is_admin, role } }
                const apiUser = json?.data || json?.user || null;
                if (!apiUser) {
                    console.log('❌ AuthContext Init - No user data in response');
                    setUser(null as any);
                    setStatus('guest');
                    setIsLoading(false);
                    setAuthInitialized(true);
                    return;
                }

                // shape-normalise minimal fields used in UI
                const clientUser = {
                    id: String(apiUser.user_id ?? apiUser.id ?? ''),
                    email: apiUser.email,
                    first_name: apiUser.first_name,
                    last_name: apiUser.last_name,
                    is_admin: !!apiUser.is_admin,
                    role: apiUser.role === 'admin' ? 'admin' : 'user',
                };

                console.log('✅ AuthContext Init - User authenticated:', clientUser);
                setUser(clientUser as any);
                setStatus('authed');
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

            const response = await AuthAPI.login(credentials.email, credentials.password);

            if (response.ok) {
                // REVISED: The response now has a nested user object
                const rawUser = response.data.user;
                const apiUser: ApiUser = isApiUser(rawUser)
                    ? rawUser
                    : {
                        user_id: String((rawUser as any)?.user_id ?? (rawUser as any)?.id ?? ''),
                        email: String((rawUser as any)?.email ?? ''),
                        first_name: (rawUser as any)?.first_name,
                        last_name: (rawUser as any)?.last_name,
                        is_admin: !!(rawUser as any)?.is_admin,
                        role: (rawUser as any)?.role ?? 'user',
                        kyc_status: (rawUser as any)?.kyc_status,
                    };
                const clientUser = toClientUser(apiUser);
                clientAuthManager.setUser(clientUser);
                setUser(clientUser as any);

                // Update status to 'authed' to prevent flicker
                setStatus('authed');

                // Store token and user safely
                if (response?.data?.token) {
                    setToken(response.data.token);
                }
                setStoredUser(clientUser);

                await logAuthEvent('user_login_success', {
                    email: credentials.email,
                    userId: apiUser.user_id
                });

                // ✅ CRITICAL: Redirect to dashboard after successful login
                console.log('User is authenticated. Redirecting to /dashboard');
                window.location.href = '/dashboard';
            } else {
                throw new Error('message' in response ? response.message : 'Login failed');
            }
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

            const response = await AuthAPI.login(credentials.email, credentials.password);

            if (response.ok) {
                const rawUser = response.data.user;
                const apiUser: ApiUser = isApiUser(rawUser)
                    ? rawUser
                    : {
                        user_id: String((rawUser as any)?.user_id ?? (rawUser as any)?.id ?? ''),
                        email: String((rawUser as any)?.email ?? ''),
                        first_name: (rawUser as any)?.first_name,
                        last_name: (rawUser as any)?.last_name,
                        is_admin: !!(rawUser as any)?.is_admin,
                        role: (rawUser as any)?.role ?? 'user',
                        kyc_status: (rawUser as any)?.kyc_status,
                    };
                const userData = apiUser;
                if (userData?.is_admin) {
                    const clientUser = toClientUser(userData);
                    clientAuthManager.setUser(clientUser);
                    setUser(clientUser as any);

                    // Update status to 'authed' to prevent flicker
                    setStatus('authed');

                    // Store token and user safely
                    if (response?.data?.token) {
                        setToken(response.data.token);
                    }
                    setStoredUser(clientUser);

                    await logAuthEvent('admin_login_success', {
                        email: credentials.email,
                        adminId: userData.user_id
                    });

                    await logAdminAction('admin_login', {
                        email: credentials.email,
                        adminId: userData.user_id
                    });
                } else {
                    throw new Error('Admin access required');
                }
            } else {
                throw new Error('Admin access required');
            }
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

            await apiClient.logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            clientAuthManager.clearAuth();
            setUser(null);
            setStatus('guest'); // ✅ CRITICAL: Update status to 'guest' on logout
            setIsLoading(false);
        }
    };


    const refreshUser = async () => {
        // 🛑 GUARD CLAUSE: Don't refresh if we're already loading or not initialized
        if (isLoading || !authInitialized) return;

        try {
            const userData = await authGuard.checkAuth(() => clientAuthManager.checkAuth());
            setUser(userData);
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
