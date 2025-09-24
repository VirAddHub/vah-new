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

    const isAuthenticated = !!user;
    const isAdmin = Boolean(user?.is_admin);

    // Initialize auth state on mount
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (clientAuthManager.isAuthenticated()) {
                    const userData = await clientAuthManager.checkAuth();
                    setUser(userData);
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);
                clientAuthManager.clearAuth();
            } finally {
                setIsLoading(false);
            }
        };

        // Add a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            console.warn('Auth initialization timeout, setting loading to false');
            setIsLoading(false);
        }, 5000);

        initializeAuth().finally(() => {
            clearTimeout(timeout);
        });
    }, []);

    const login = async (credentials: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            await logAuthEvent('user_login_attempt', { email: credentials.email });

            const response = await apiClient.login(credentials.email, credentials.password);

            if (response.ok && response.data) {
                // Set user data from the response (support both shapes)
                const userData = (response.data?.user) ?? response.data;
                clientAuthManager.setUser(userData);
                setUser(userData);

                await logAuthEvent('user_login_success', {
                    email: credentials.email,
                    userId: userData.id
                });
            } else {
                throw new Error('error' in response ? response.error : 'Login failed');
            }
        } catch (error: any) {
            await logAuthEvent('user_login_failed', {
                email: credentials.email,
                error_message: getErrorMessage(error), stack: getErrorStack(error)
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

            if (response.ok && response.data) {
                const userData = (response.data?.user) ?? response.data;
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
                error_message: getErrorMessage(error), stack: getErrorStack(error)
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
