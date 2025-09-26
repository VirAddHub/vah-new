"use client";

import { EnhancedAdminDashboard } from '../../../components/EnhancedAdminDashboard';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';
import { RouteGuard } from '../../../components/RouteGuard';

function AdminDashboardContent() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const handleNavigate = (page: string, data?: unknown) => {
        // Handle navigation within the admin dashboard
        console.log('Navigate to:', page, data);
    };

    const handleGoBack = () => {
        window.location.href = '/';
    };

    return (
        <RouteGuard requireAuth requireAdmin>
            <EnhancedAdminDashboard
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                onGoBack={handleGoBack}
            />
        </RouteGuard>
    );
}

export default function AdminDashboardPage() {
    return (
        <AuthProvider>
            <AdminDashboardContent />
        </AuthProvider>
    );
}
