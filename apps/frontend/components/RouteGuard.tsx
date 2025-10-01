"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface RouteGuardProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    requireAdmin?: boolean;
}

export function RouteGuard({ children, requireAuth = false, requireAdmin = false }: RouteGuardProps) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) return; // Wait for auth check to complete

        // Check authentication requirement
        if (requireAuth && !isAuthenticated) {
            console.log('RouteGuard: Redirecting to login - not authenticated');
            router.replace('/login');
            return;
        }

        // Check admin requirement
        if (requireAdmin && !isAdmin) {
            console.log('RouteGuard: Redirecting to dashboard - not admin');
            router.replace('/dashboard');
            return;
        }

        // Redirect non-admins away from admin routes
        if (pathname.startsWith('/admin') && isAuthenticated && !isAdmin) {
            console.log('RouteGuard: Redirecting to dashboard - admin route accessed by non-admin');
            router.replace('/dashboard');
            return;
        }
    }, [isAuthenticated, isAdmin, isLoading, requireAuth, requireAdmin, pathname, router]);

    // ✅ KEY FIX: Don't render anything while loading or redirecting
    if (isLoading) return null;           // wait for auth to resolve
    if (requireAuth && !isAuthenticated) return null;     // prevent paint before redirect
    if (requireAdmin && !isAdmin) return null;
    if (pathname.startsWith('/admin') && isAuthenticated && !isAdmin) return null;

    return <>{children}</>;
}
