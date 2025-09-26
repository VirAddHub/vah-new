"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getErrorMessage, getErrorStack } from '../lib/errors';
import { apiClient } from '../lib/api-client';
import { clientAuthManager } from '../lib/client-auth';

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
                    const userData = JSON.parse(localStorage.getItem('user') || 'null');
                    if (userData) {
                        setUser(userData);
                    }
                    setIsLoading(false);
                    setAuthInitialized(true); // ✅ Mark as initialized
                    return;
                }

                // Always try to check auth, even if localStorage says we're not authenticated
                // This handles cases where the session cookie is still valid
                try {
                    const userData = await clientAuthManager.checkAuth();
                    setUser(userData);
                } catch (error) {
                    // Only clear auth if we're sure there's no valid session
                    console.log('No valid session found, user will need to login again');
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
    }, [authInitialized]); // ✅ Include authInitialized in deps

    const login = async (credentials: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            await logAuthEvent('user_login_attempt', { email: credentials.email });

            const response = await apiClient.login(credentials.email, credentials.password);

            if (response.ok && response.data?.user) {
                // Set user data from the response
                const userData = response.data.user;
                clientAuthManager.setUser(userData);
                setUser(userData);

                await logAuthEvent('user_login_success', {
                    email: credentials.email,
                    userId: userData.id
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

            const response = await apiClient.login(credentials.email, credentials.password);

            if (response.ok && response.data?.user) {
                const userData = response.data.user;
                if (userData?.is_admin) {
                    clientAuthManager.setUser(userData);
                    setUser(userData);

                    await logAuthEvent('admin_login_success', {
                        email: credentials.email,
                        adminId: userData.id
                    });

                    await logAdminAction('admin_login', {
                        email: credentials.email,
                        adminId: userData.id
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

            await apiClient.post('/api/auth/logout');
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
            const userData = await clientAuthManager.checkAuth();
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
