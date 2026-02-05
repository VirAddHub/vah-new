'use client';

import { useRouter } from 'next/navigation';
import { MarketingNavigation } from '../MarketingNavigation';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function HeaderWithNav() {
    const router = useRouter();
    const handleNavigate = createNavigationHandler(router);
    return <MarketingNavigation onNavigate={handleNavigate} />;
}

