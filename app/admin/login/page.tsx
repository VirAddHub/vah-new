"use client";

import { useState, useEffect } from 'react';
import { AdminLogin } from '../../../components/auth/AdminLogin';
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

    const handleLogin = () => {
        setShowDashboard(true);
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
        <AdminLogin
            onLogin={handleLogin}
            onGoBack={handleGoBack}
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
