'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, ApiErr, isOk } from './api-client';

// User type definition
export interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
    isAuthenticated: boolean;
}

// Auth context type
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    error: string | null;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if user is authenticated on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await apiClient.get<{ user: User }>('/auth/whoami');

            if (isOk(response)) {
                setUser({
                    ...response.data.user,
                    isAuthenticated: true,
                });
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await apiClient.post<{ user: User; token?: string }>('/auth/login', {
                email,
                password,
            });

            if (isOk(response)) {
                setUser({
                    ...response.data.user,
                    isAuthenticated: true,
                });

                // Store token if provided
                if (response.data.token) {
                    localStorage.setItem('auth_token', response.data.token);
                }
            } else {
                setError(response.message || 'Login failed');
            }
        } catch (error) {
            const errorMessage = (error && typeof error === "object" && "message" in error)
                ? (error as any).message
                : 'Login failed. Please try again.';
            setError(errorMessage);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout', {});
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('auth_token');
        }
    };

    const refreshUser = async () => {
        await checkAuth();
    };

    // Initialize auth token from localStorage
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Token is stored in localStorage, no need to set it on apiClient
        }
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        error,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Hook for protected routes
export function useRequireAuth() {
    const { user, isLoading } = useAuth();

    return {
        user,
        isLoading,
        isAuthenticated: !!user?.isAuthenticated,
    };
}
