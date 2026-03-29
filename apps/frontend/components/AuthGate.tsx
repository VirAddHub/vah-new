'use client';

import { useAuth } from '../contexts/AuthContext';

/**
 * Waits for AuthContext to finish its initial check before showing app chrome.
 * Avoids `next/dynamic` + `ssr: false` here — that caused Next 15 to bail out of SSR
 * with "Bail out to client-side rendering: next/dynamic" on every layout render.
 */
function AuthGateInner({ children }: { children: React.ReactNode }) {
    const { loading } = useAuth();

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

export function AuthGate({ children }: { children: React.ReactNode }) {
    return <AuthGateInner>{children}</AuthGateInner>;
}
