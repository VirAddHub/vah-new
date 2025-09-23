"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, authManager, logAuthEvent, logAdminAction } from '../lib';

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
                if (authManager.isAuthenticated()) {
                    const userData = await authManager.checkAuth();
                    setUser(userData);
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);
                authManager.clearAuth();
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

            if (response.ok) {
                authManager.setToken(response.token);
                authManager.setUser(response.user);
                setUser(response.user);

                await logAuthEvent('user_login_success', {
                    email: credentials.email,
                    userId: response.user.id
                });
            } else {
                throw new Error('Login failed');
            }
        } catch (error: any) {
            await logAuthEvent('user_login_failed', {
                email: credentials.email,
                error: error.message
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

            if (response.ok && response.user?.is_admin) {
                authManager.setToken(response.token);
                authManager.setUser(response.user);
                setUser(response.user);

                await logAuthEvent('admin_login_success', {
                    email: credentials.email,
                    adminId: response.user.id
                });

                await logAdminAction('admin_login', {
                    email: credentials.email,
                    adminId: response.user.id
                });
            } else {
                throw new Error('Admin access required');
            }
        } catch (error: any) {
            await logAuthEvent('admin_login_failed', {
                email: credentials.email,
                error: error.message
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
            authManager.clearAuth();
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

        authManager.setUser(demoUser);
        authManager.setToken(`demo-${type}-token`);
        setUser(demoUser);

        logAuthEvent(`${type}_demo_session_created`, {
            email: demoUser.email,
            userId: demoUser.id
        });
    };

    const refreshUser = async () => {
        try {
            const userData = await authManager.checkAuth();
            setUser(userData);
        } catch (error) {
            console.error('Failed to refresh user data:', error);
            authManager.clearAuth();
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
