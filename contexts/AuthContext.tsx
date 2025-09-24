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
    name: string;
    is_admin?: boolean;
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
    createDemoSession: (type: 'user' | 'admin') => void;
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
    const isAdmin = user?.is_admin || false;

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

        initializeAuth();
    }, []);

    const login = async (credentials: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            await logAuthEvent('user_login_attempt', { email: credentials.email });

            const response = await apiClient.post('/api/auth/login', credentials);

            if (response.ok && response.data) {
                clientAuthManager.setToken(response.data.token || 'demo-token');
                clientAuthManager.setUser(response.data.user);
                setUser(response.data.user);

                await logAuthEvent('user_login_success', {
                    email: credentials.email,
                    userId: response.data.user.id
                });
            } else {
                throw new Error('Login failed');
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

            const response = await apiClient.post('/api/auth/login', {
                ...credentials,
                isAdmin: true
            });

            if (response.ok && response.data?.user?.is_admin) {
                clientAuthManager.setToken(response.data.token || 'demo-token');
                clientAuthManager.setUser(response.data.user);
                setUser(response.data.user);

                await logAuthEvent('admin_login_success', {
                    email: credentials.email,
                    adminId: response.data.user.id
                });

                await logAdminAction('admin_login', {
                    email: credentials.email,
                    adminId: response.data.user.id
                });
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

    const createDemoSession = (type: 'user' | 'admin') => {
        const demoUser: User = type === 'admin'
            ? {
                id: 'demo-admin',
                email: 'admin@virtualaddresshub.co.uk',
                name: 'Demo Admin',
                is_admin: true,
                role: 'super_admin',
                kyc_status: 'approved',
                plan: 'professional'
            }
            : {
                id: 'demo-user',
                email: 'demo@virtualaddresshub.co.uk',
                name: 'Demo User',
                is_admin: false,
                role: 'user',
                kyc_status: 'approved',
                plan: 'premium'
            };

        clientAuthManager.setUser(demoUser);
        clientAuthManager.setToken(`demo-${type}-token`);
        setUser(demoUser);

        logAuthEvent(`${type}_demo_session_created`, {
            email: demoUser.email,
            userId: demoUser.id
        });
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
        createDemoSession,
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
