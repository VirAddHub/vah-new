"use client";

import { useState, useEffect } from 'react';
import Login from '../../../components/Login';
import { AdminDashboard } from '../../../components/admin/AdminDashboard';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';

function AdminPageContent() {
    const { isAuthenticated, isAdmin, logout } = useAuth();
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
        if (isAuthenticated && isAdmin) {
            setShowDashboard(true);
        } else {
            setShowDashboard(false);
        }
    }, [isAuthenticated, isAdmin]);

    const handleLoginSuccess = (role: 'admin' | 'user') => {
        if (role === 'admin') {
            setShowDashboard(true);
        } else {
            // Redirect regular users to their dashboard
            window.location.href = '/dashboard';
        }
    };

    const handleLogout = async () => {
        await logout();
        setShowDashboard(false);
    };

    const handleGoBack = () => {
        window.location.href = '/';
    };

    if (showDashboard) {
        return (
            <AdminDashboard
                onLogout={handleLogout}
                onNavigate={(page: string, data?: any) => {
                    console.log('Navigate to:', page, data);
                    // Handle navigation to different admin pages
                }}
                onGoBack={handleGoBack}
            />
        );
    }

    return (
        <Login
            onSuccess={handleLoginSuccess}
            onNavigate={(page: string) => {
                if (page === 'signup') {
                    window.location.href = '/signup';
                } else if (page === 'reset-password') {
                    // Handle password reset
                    console.log('Password reset requested');
                }
            }}
        />
    );
}

export default function AdminLoginPage() {
    return (
        <AuthProvider>
            <AdminPageContent />
        </AuthProvider>
    );
}
