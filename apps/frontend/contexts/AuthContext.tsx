"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

    const isAuthenticated = !!user;
    const isAdmin = Boolean(user?.is_admin);

    // Initialize auth state on mount - ONLY ONCE
    useEffect(() => {
        // 🛑 GUARD CLAUSE: Don't run if we've already initialized
        if (authInitialized) return;

        const initializeAuth = async () => {
            try {
                // Check if this is a fresh login redirect
                const url = new URL(window.location.href);
                const firstBoot = url.searchParams.get('logged') === '1' || localStorage.getItem('auth_bootstrap') === '1';

                if (firstBoot) {
                    // Trust localStorage once; clear the flag
                    localStorage.removeItem('auth_bootstrap');
                    const userData = getStoredUser<any>();
                    if (userData) {
                        setUser(userData);
                        clientAuthManager.markInitialized(); // ✅ Mark client auth as initialized
                    }
                    setIsLoading(false);
                    setAuthInitialized(true); // ✅ Mark as initialized
                    return;
                }

                // Always try to check auth, even if localStorage says we're not authenticated
                // This handles cases where the session cookie is still valid
                // ✅ CRITICAL: Never initiate redirects from AuthContext - middleware handles this
                try {
                    const userData = await authGuard.checkAuth(() => clientAuthManager.checkAuth());
                    setUser(userData);
                } catch (error) {
                    // Only clear auth if we're sure there's no valid session
                    console.log('No valid session found, user will need to login again');
                    // ✅ Don't redirect here - let middleware handle unauthenticated users
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);
                clientAuthManager.clearAuth();
            } finally {
                setIsLoading(false);
                setAuthInitialized(true); // ✅ Mark as initialized
            }
        };

        // Add a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            console.warn('Auth initialization timeout, setting loading to false');
            setIsLoading(false);
            setAuthInitialized(true); // ✅ Mark as initialized even on timeout
        }, 5000);

        initializeAuth().finally(() => {
            clearTimeout(timeout);
        });
    }, []); // ✅ Empty dependency array - run only once on mount

    const login = async (credentials: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            await logAuthEvent('user_login_attempt', { email: credentials.email });

            const response = await AuthAPI.login(credentials.email, credentials.password);

            if (response.ok) {
                // Set user data from the response
                const rawUser = (response as any)?.data?.user ?? (response as any)?.data;
                const apiUser: ApiUser = isApiUser(rawUser)
                    ? rawUser
                    : {
                        user_id: String(rawUser?.user_id ?? rawUser?.id ?? ''),
                        email: String(rawUser?.email ?? ''),
                        first_name: rawUser?.first_name,
                        last_name: rawUser?.last_name,
                        is_admin: !!rawUser?.is_admin,
                        role: rawUser?.role ?? 'user',
                        kyc_status: rawUser?.kyc_status,
                    };
                const userData = apiUser;
                const clientUser = toClientUser(userData);
                clientAuthManager.setUser(clientUser);
                setUser(clientUser as any);

                // Store token and user safely
                if (response?.data?.token) {
                    setToken(response.data.token);
                }
                setStoredUser(clientUser);

                await logAuthEvent('user_login_success', {
                    email: credentials.email,
                    userId: userData.user_id
                });
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
                const rawUser = (response as any)?.data?.user ?? (response as any)?.data;
                const apiUser: ApiUser = isApiUser(rawUser)
                    ? rawUser
                    : {
                        user_id: String(rawUser?.user_id ?? rawUser?.id ?? ''),
                        email: String(rawUser?.email ?? ''),
                        first_name: rawUser?.first_name,
                        last_name: rawUser?.last_name,
                        is_admin: !!rawUser?.is_admin,
                        role: rawUser?.role ?? 'user',
                        kyc_status: rawUser?.kyc_status,
                    };
                const userData = apiUser;
                if (userData?.is_admin) {
                    const clientUser = toClientUser(userData);
                    clientAuthManager.setUser(clientUser);
                    setUser(clientUser as any);

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

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
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
