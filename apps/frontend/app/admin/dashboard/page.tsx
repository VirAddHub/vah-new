"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { EnhancedAdminDashboard } from '@/components/EnhancedAdminDashboard';
import { clearToken } from '@/lib/token-manager';

export default function AdminDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is authenticated and is admin
        const token = localStorage.getItem('vah_jwt');
        const storedUser = localStorage.getItem('vah_user');

        if (!token) {
            // Not authenticated, redirect to admin login
            router.push('/admin/login');
            return;
        }

        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                // Check if user is admin
                if (!userData.is_admin && userData.role !== 'admin') {
                    // Not an admin, redirect to user dashboard
                    router.push('/dashboard');
                    return;
                }
                setUser(userData);
            } catch (e) {
                console.error('Failed to parse stored user:', e);
                router.push('/admin/login');
                return;
            }
        }

        setLoading(false);
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    const handleLogout = async () => {
        // Prevent multiple logout attempts
        if ((handleLogout as any).__isLoggingOut) {
            return;
        }
        (handleLogout as any).__isLoggingOut = true;

        try {
            // Call logout API endpoint - backend will clear httpOnly cookies
            await fetch('/api/bff/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Clear client-side tokens (localStorage + CSRF cookie)
            clearToken();
            // Clear all localStorage items related to auth
            localStorage.removeItem('vah_jwt');
            localStorage.removeItem('vah_user');
            // Force clear cookies client-side as well
            const isSecure = window.location.protocol === 'https:';
            const sameSiteValue = isSecure ? 'None' : 'Lax';
            const secureFlag = isSecure ? '; Secure' : '';
            document.cookie = `vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            document.cookie = `vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=${sameSiteValue}${secureFlag}`;
            
            // Use replace with a longer delay to ensure everything is cleared
            // Stop any ongoing requests by navigating immediately
            window.stop(); // Stop any pending requests
            setTimeout(() => {
                window.location.replace('/admin/login');
            }, 200);
        }
    };

    const handleNavigate = (page: string) => {
        console.log('Navigate to:', page);
        if (page === 'home') {
            router.push('/');
        } else {
            router.push(`/${page}`);
        }
    };

    const handleGoBack = () => {
        router.push('/');
    };

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading admin dashboard...</p>
                </div>
            </div>
        }>
            <EnhancedAdminDashboard
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                onGoBack={handleGoBack}
            />
        </Suspense>
    );
}
