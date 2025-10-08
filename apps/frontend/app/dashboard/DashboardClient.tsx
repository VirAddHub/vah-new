"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserDashboard } from '@/components/UserDashboard';

export default function DashboardClient() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('vah_jwt');
        if (!token) {
            router.push('/login');
            return;
        }

        setIsAuthenticated(true);
        setIsLoading(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('vah_jwt');
        localStorage.removeItem('vah_user');
        router.push('/login');
    };

    const handleNavigate = (page: string) => {
        // Handle navigation to different pages
        switch (page) {
            case 'help':
                router.push('/help');
                break;
            case 'forwarding':
                router.push('/forwarding');
                break;
            case 'billing':
                router.push('/billing');
                break;
            case 'dashboard-support':
            case 'contact':
                router.push('/contact');
                break;
            case 'dashboard-profile':
                router.push('/settings/profile');
                break;
            case 'dashboard-settings':
                router.push('/settings');
                break;
            default:
                console.log('Navigate to:', page);
        }
    };

    const handleGoBack = () => {
        // Handle going back
        console.log('Go back');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect to login
    }

    return (
        <UserDashboard
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
        />
    );
}
