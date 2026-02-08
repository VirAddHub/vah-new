"use client";

import { useState, useEffect } from 'react';
import { EnhancedAdminDashboard } from '../../../components/EnhancedAdminDashboard';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';

function AdminPageContent() {
    const { isAuthenticated, isAdmin, logout } = useAuth();
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
        // Only redirect if not already showing dashboard
        if (isAuthenticated && isAdmin) {
            setShowDashboard(true);
        } else if (isAuthenticated && !isAdmin) {
            // Redirect regular users to their dashboard (not admin login to avoid loop)
            if (!showDashboard) {
                window.location.replace('/dashboard');
            }
        } else {
            // Don't redirect unauthenticated users - they're already on login page
            // This prevents redirect loops
            setShowDashboard(false);
        }
    }, [isAuthenticated, isAdmin, showDashboard]);

    const handleLogout = async () => {
        // Prevent multiple logout attempts
        if ((handleLogout as any).__isLoggingOut) {
            return;
        }
        (handleLogout as any).__isLoggingOut = true;

        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // Clear all auth state
            localStorage.removeItem('vah_jwt');
            localStorage.removeItem('vah_user');
            // Force clear cookies
            const isSecure = window.location.protocol === 'https:';
            const sameSiteValue = isSecure ? 'None' : 'Lax';
            const secureFlag = isSecure ? '; Secure' : '';
            document.cookie = `vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            
            window.stop();
            setTimeout(() => {
                window.location.replace('/admin/login');
            }, 200);
        }
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
