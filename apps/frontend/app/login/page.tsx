"use client";

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Login from '../../components/Login';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isAdmin, isLoading } = useAuth();

    useEffect(() => {
        // Wait for auth check to complete
        if (isLoading) return;

        // Only redirect if authenticated AND not forced to stay on login page
        const forceLogin = searchParams.get('force') === 'true';

        if (isAuthenticated && !forceLogin) {
            const destination = isAdmin ? '/admin/dashboard' : '/dashboard';
            console.log('✅ User already authenticated, redirecting to', destination);
            router.replace(destination);
        }
    }, [isAuthenticated, isAdmin, isLoading, searchParams, router]);

    // Show login form (even if authenticated, if force=true)
    return (
        <Login
            onNavigate={(page: string) => {
                if (page === 'signup') router.push('/signup');
            }}
        />
    );
}
