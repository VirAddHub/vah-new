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
    // Initialise from localStorage synchronously so we don't flash a loader
    const [hasToken, setHasToken] = useState<boolean | null>(null);

    useEffect(() => {
        // Check auth token on mount (client-only codepath)
        const token = window.localStorage.getItem('vah_jwt');
        if (!token) {
            router.replace('/login');
            setHasToken(false);
            return;
        }
        setHasToken(true);
    }, [router]);

    const handleLogout = () => {
        // Clear local auth state
        clearToken();
        setStoredUser(null);

        // Clear backend session cookie (HttpOnly may not be readable, but expiry still works)
        document.cookie = 'vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Also clear CSRF cookie explicitly (defensive)
        document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.replace('/login');
    };

    const handleNavigate = (page: string) => {
        // Handle navigation to different pages
        // Note: forwarding, account, settings, profile, billing are handled by UserDashboard's right panel
        // and won't navigate away from the dashboard
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
            case 'billing':
            case 'settings':
            case 'account':
            case 'profile':
                // These are handled by UserDashboard's right panel - no navigation needed
                break;
            case 'contact':
            case 'support':
                router.push('/contact');
                break;
            default:
                console.log('Navigate to:', page);
        }
    };

    const handleGoBack = () => {
        // Handle going back
        console.log('Go back');
    };

    // While we are checking for a token, render nothing to avoid flicker.
    if (hasToken === null) return null;
    // If there is no token we already triggered a redirect.
    if (hasToken === false) return null;

    return (
        <UserDashboard
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
        />
    );
}
