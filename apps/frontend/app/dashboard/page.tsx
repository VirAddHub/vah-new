"use client";

export const dynamic = 'force-dynamic';

import { SimpleDashboard } from '../../components/SimpleDashboard';
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
            <SimpleDashboard
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
