"use client";

import { useState, useEffect } from 'react';
import Login from '../../components/Login';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

function UserPageContent() {
    const { isAuthenticated, isAdmin } = useAuth();
    const [showDashboard, setShowDashboard] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            if (isAdmin) {
                // Redirect admins to admin dashboard
                window.location.href = '/admin';
            } else {
                setShowDashboard(true);
            }
        } else {
            setShowDashboard(false);
        }
    }, [isAuthenticated, isAdmin]);

    const handleLoginSuccess = (role: 'admin' | 'user') => {
        if (role === 'admin') {
            window.location.href = '/admin/login';
        } else {
            setShowDashboard(true);
        }
    };

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
