"use client";

import { useState, useEffect } from 'react';
import { EnhancedAdminDashboard } from '../../../components/EnhancedAdminDashboard';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';

function AdminDashboardContent() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
        if (isLoading) return;
        
        if (isAuthenticated && isAdmin) {
            setShowDashboard(true);
        } else if (isAuthenticated && !isAdmin) {
            // Redirect regular users to their dashboard
            window.location.href = '/dashboard';
        } else {
            // Redirect unauthenticated users to login
            window.location.href = '/login';
        }
    }, [isAuthenticated, isAdmin, isLoading]);

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
            
            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Logout failed:', error);
            window.location.href = '/login';
        }
    };

    const handleNavigate = (page: string, data?: any) => {
        // Handle navigation within the admin dashboard
        console.log('Navigate to:', page, data);
    };

    const handleGoBack = () => {
        window.location.href = '/';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!showDashboard) {
        return null;
    }

    return (
        <EnhancedAdminDashboard
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
        />
    );
}

export default function AdminDashboardPage() {
    return (
        <AuthProvider>
            <AdminDashboardContent />
        </AuthProvider>
    );
}
