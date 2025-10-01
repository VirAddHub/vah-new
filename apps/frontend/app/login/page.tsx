"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Login from '../../components/Login';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
    const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
    const router = useRouter();
    const hasRedirected = useRef(false);

    useEffect(() => {
        // Wait until the initial auth check is complete
        if (isLoading) {
            console.log('🔍 LoginPage - Still loading auth state...');
            return;
        }

        console.log('🔍 LoginPage - Auth state loaded:', { isAuthenticated, isAdmin, user });

        // If authenticated, redirect the user away from the login page
        if (isAuthenticated && !hasRedirected.current) {
            hasRedirected.current = true;
            const destination = isAdmin ? '/admin/dashboard' : '/dashboard';
            console.log(`🔍 LoginPage - User is authenticated. Redirecting to ${destination}`);
            console.log('🔍 LoginPage - User data:', user);
            router.replace(destination);
        } else {
            console.log('🔍 LoginPage - User not authenticated, showing login form');
        }
    }, [isAuthenticated, isAdmin, isLoading, router, user]);

    // Render nothing while loading or if about to redirect, to prevent UI flicker
    if (isLoading || isAuthenticated) {
        return null; // Or a loading spinner
    }

    // Render the login form only if the user is not authenticated
    return (
        <Login
            onNavigate={(page: string) => {
                if (page === 'signup') router.push('/signup');
            }}
        />
    );
}
