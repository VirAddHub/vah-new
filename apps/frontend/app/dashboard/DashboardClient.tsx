"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { clearToken, setStoredUser } from '@/lib/token-manager';

const UserDashboard = dynamic(
    () => import('@/components/UserDashboard').then((mod) => ({ default: mod.UserDashboard })),
    {
        loading: () => (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        ),
    }
);

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
        // Clear local auth state
        clearToken();
        setStoredUser(null);

        // Clear backend session cookie (HttpOnly may not be readable, but expiry still works)
        document.cookie = 'vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Also clear CSRF cookie explicitly (defensive)
        document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.push('/login');
    };

    const handleNavigate = (page: string) => {
        // Handle navigation to different pages
        switch (page) {
            case 'home':
                router.push('/');
                break;
            case 'help':
                router.push('/help');
                break;
            case 'business-owners':
                router.push('/business-owners');
                break;
            case 'forwarding':
                router.push('/forwarding');
                break;
            case 'billing':
                router.push('/account');
                break;
            case 'contact':
            case 'support':
                router.push('/contact');
                break;
            case 'settings':
                router.push('/account');
                break;
            case 'account':
                router.push('/account');
                break;
            case 'profile':
                router.push('/account');
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
