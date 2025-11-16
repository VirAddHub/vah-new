'use client';

import { useRouter } from 'next/navigation';
import { TermsPage } from '@/components/TermsPage';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function TermsPageClient() {
    const router = useRouter();
    const handleNavigate = createNavigationHandler(router);
    return <TermsPage onNavigate={handleNavigate} />;
}

