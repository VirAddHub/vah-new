"use client";

import { EnhancedUserDashboard } from '../../components/EnhancedUserDashboard';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { RouteGuard } from '../../components/RouteGuard';

function DashboardContent() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const handleNavigate = (page: string) => {
        // Handle navigation within the dashboard
        console.log('Navigate to:', page);
    };

    const handleGoBack = () => {
        window.location.href = '/';
    };

    return (
        <RouteGuard requireAuth>
            <EnhancedUserDashboard
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                onGoBack={handleGoBack}
            />
        </RouteGuard>
    );
}

export default function DashboardPage() {
    return (
        <AuthProvider>
            <DashboardContent />
        </AuthProvider>
    );
}
