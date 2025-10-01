import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Protected({ children }: { children: React.ReactNode }) {
    const { loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const redirected = useRef(false);

    useEffect(() => {
        if (loading) return;
        if (!isAuthenticated && !redirected.current) {
            redirected.current = true;
            router.replace('/login');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) return null;
    if (!isAuthenticated) return null;
    return <>{children}</>;
}
