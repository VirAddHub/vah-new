'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGate({ children }: { children: React.ReactNode }) {
    const { loading, isAuthenticated, isAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Wait for auth check to complete
        if (loading) return;

        // If user is authenticated and on login page, redirect to dashboard
        if (isAuthenticated && pathname === '/login') {
            const destination = isAdmin ? '/admin/dashboard' : '/dashboard';
            console.log(`🔍 AuthGate - Authenticated user on login page, redirecting to ${destination}`);
            router.replace(destination);
        }
    }, [loading, isAuthenticated, isAdmin, pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
