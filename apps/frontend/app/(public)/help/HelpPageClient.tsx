'use client';

import { useRouter } from 'next/navigation';
import { HelpPage } from '@/components/HelpPage';
import { createNavigationHandler } from '@/lib/navigation-handler';

/**
 * Help Centre Client Component
 * 
 * Wiring only - no layout, no scroll manipulation
 * Scroll behavior handled by Next.js App Router automatically
 */
export function HelpPageClient() {
    const router = useRouter();
    const handleNavigate = createNavigationHandler(router);

    const handleGoBack = () => {
        router.back();
    };

    return <HelpPage onNavigate={handleNavigate} onGoBack={handleGoBack} />;
}

