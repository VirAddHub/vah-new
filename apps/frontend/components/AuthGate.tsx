'use client';

import { useAuth } from '../contexts/AuthContext';
import dynamic from 'next/dynamic';

// Create a client-only version of AuthGate
const ClientAuthGate = dynamic(() => Promise.resolve(AuthGateInner), { 
    ssr: false,
    loading: () => <div>Loading...</div>
});

function AuthGateInner({ children }: { children: React.ReactNode }) {
    const { loading } = useAuth();

    // Show loading spinner while checking authentication
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

    // Just render children - let middleware handle redirects
    return <>{children}</>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
    return <ClientAuthGate>{children}</ClientAuthGate>;
}
