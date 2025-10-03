"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleUserDashboard } from '@/components/SimpleUserDashboard';

export default function DashboardClient() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('DashboardClient: Checking authentication...');

        // Check if user is authenticated
        const token = localStorage.getItem('vah_jwt');
        const storedUser = localStorage.getItem('vah_user');

        console.log('DashboardClient: Token exists:', !!token);
        console.log('DashboardClient: Stored user exists:', !!storedUser);

        if (!token) {
            console.log('DashboardClient: No token, redirecting to login');
            // Not authenticated, redirect to login
            router.push('/login');
            return;
        }

        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('DashboardClient: User parsed successfully:', parsedUser);
                setUser(parsedUser);
            } catch (e) {
                console.error('Failed to parse stored user:', e);
            }
        }

        setLoading(false);
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    const handleLogout = () => {
        localStorage.removeItem('vah_jwt');
        localStorage.removeItem('vah_user');
        document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.push('/login');
    };

    const handleNavigate = (page: string) => {
        console.log('Navigate to:', page);
    };

    const handleGoBack = () => {
        router.push('/');
    };

    return (
        <SimpleUserDashboard
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
        />
    );
}
