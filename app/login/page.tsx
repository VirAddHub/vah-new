"use client";

import { useState, useEffect } from 'react';
import Login from '../../components/Login';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

function UserPageContent() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
        console.log('Auth state changed:', { isAuthenticated, isAdmin, isLoading });
        // Don't check authentication until loading is complete
        if (isLoading) return;
        
        if (isAuthenticated) {
            console.log('User is authenticated, redirecting...');
            if (isAdmin) {
                // Redirect admins to admin dashboard
                console.log('Redirecting admin to /admin/dashboard');
                window.location.href = '/admin/dashboard';
            } else {
                // Redirect users to their dashboard
                console.log('Redirecting user to /dashboard');
                window.location.href = '/dashboard';
            }
        } else {
            console.log('User not authenticated, showing login form');
            setShowDashboard(false);
        }
    }, [isAuthenticated, isAdmin, isLoading]);

    const handleLoginSuccess = (role: 'admin' | 'user') => {
        console.log('Login success, role:', role);
        if (role === 'admin') {
            console.log('Redirecting admin to /admin/dashboard');
            // Use setTimeout to ensure state updates are processed
            setTimeout(() => {
                window.location.href = '/admin/dashboard';
            }, 100);
        } else {
            console.log('Redirecting user to /dashboard');
            // Use setTimeout to ensure state updates are processed
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 100);
        }
    };

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (showDashboard) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h1>
                    <p className="text-muted-foreground">User dashboard coming soon...</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <Login
            onSuccess={handleLoginSuccess}
            onNavigate={(page: string) => {
                if (page === 'signup') {
                    window.location.href = '/signup';
                } else if (page === 'reset-password') {
                    // Handle password reset
                    console.log('Password reset requested');
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
