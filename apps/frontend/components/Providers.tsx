'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGate } from '@/components/AuthGate';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <AuthGate>{children}</AuthGate>
        </AuthProvider>
    );
}
