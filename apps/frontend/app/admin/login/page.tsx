"use client";

import { useState, useEffect } from 'react';
import { EnhancedAdminDashboard } from '../../../components/EnhancedAdminDashboard';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';

function AdminPageContent() {
    const { isAuthenticated, isAdmin, logout } = useAuth();
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
        if (isAuthenticated && isAdmin) {
            setShowDashboard(true);
        } else if (isAuthenticated && !isAdmin) {
            // Redirect regular users to their dashboard
            window.location.href = '/login';
        } else {
            // Redirect unauthenticated users to login
            window.location.href = '/login';
        }
    }, [isAuthenticated, isAdmin]);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const handleGoBack = () => {
        window.location.href = '/';
    };

    if (showDashboard) {
        return (
            <EnhancedAdminDashboard
                onLogout={handleLogout}
                onNavigate={(page: string, data?: any) => {
                    console.log('Navigate to:', page, data);
                    // Handle navigation to different admin pages
                }}
                onGoBack={handleGoBack}
            />
        );
    }

    // Show loading while redirecting
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Redirecting to login...</p>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <AuthProvider>
            <AdminPageContent />
        </AuthProvider>
    );
}
