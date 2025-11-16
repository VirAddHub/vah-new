'use client';

import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function HeaderWithNav() {
    const router = useRouter();
    const handleNavigate = createNavigationHandler(router);
    return <Header onNavigate={handleNavigate} />;
}

