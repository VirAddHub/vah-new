"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Login from '../../components/Login';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

function UserPageContent() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const router = useRouter();
    const redirectedRef = useRef(false); // ✅ prevent redirect loops

    useEffect(() => {
        console.log('Auth state changed:', { isAuthenticated, isAdmin, isLoading });
        // Don't check authentication until loading is complete
        if (isLoading) return;

        if (isAuthenticated && !redirectedRef.current) {
            console.log('User is authenticated, redirecting...');
            redirectedRef.current = true; // ✅ prevent multiple redirects
            if (isAdmin) {
                // Redirect admins to admin dashboard
                console.log('Redirecting admin to /admin/dashboard');
                router.replace('/admin/dashboard');
            } else {
                // Redirect users to their dashboard
                console.log('Redirecting user to /dashboard');
                router.replace('/dashboard');
            }
        } else if (!isAuthenticated) {
            console.log('User not authenticated, showing login form');
        }
    }, [isAuthenticated, isAdmin, isLoading, router]);

    const handleLoginSuccess = (role: 'admin' | 'user') => {
        console.log('Login success, role:', role);
        if (!redirectedRef.current) {
            redirectedRef.current = true; // ✅ prevent multiple redirects
            if (role === 'admin') {
                console.log('Redirecting admin to /admin/dashboard');
                router.replace('/admin/dashboard');
            } else {
                console.log('Redirecting user to /dashboard');
                router.replace('/dashboard');
            }
        }
    };

    // ✅ KEY FIX: Don't render anything while loading or redirecting
    if (isLoading) return null;           // wait for auth to resolve
    if (isAuthenticated) return null;     // prevent paint before redirect

    return (
        <Login
            onSuccess={handleLoginSuccess}
            onNavigate={(page: string) => {
                if (page === 'signup') {
                    router.push('/signup');
                } else if (page === 'reset-password') {
                    router.push('/reset-password');
                }
            }}
        />
    );
}

export default function UserLoginPage() {
    return (
        <AuthProvider>
            <UserPageContent />
        </AuthProvider>
    );
}
