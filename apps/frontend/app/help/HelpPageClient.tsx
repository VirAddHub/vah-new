'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpPage } from '@/components/HelpPage';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function HelpPageClient() {
    const router = useRouter();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const handleNavigate = createNavigationHandler(router);

    const handleGoBack = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.history.back();
    };

    return <HelpPage onNavigate={handleNavigate} onGoBack={handleGoBack} />;
}

