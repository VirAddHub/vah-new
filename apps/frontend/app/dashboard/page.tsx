"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedUserDashboard from '@/components/EnhancedUserDashboard';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('vah_jwt');
        const storedUser = localStorage.getItem('vah_user');

        if (!token) {
            // Not authenticated, redirect to login
            router.push('/login');
            return;
        }

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse stored user:', e);
            }
        }

        setLoading(false);
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return <EnhancedUserDashboard />;
}
