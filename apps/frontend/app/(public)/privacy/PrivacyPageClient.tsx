'use client';

import { useRouter } from 'next/navigation';
import { PrivacyPolicyPage } from '@/components/PrivacyPolicyPage';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function PrivacyPageClient() {
    const router = useRouter();
    const handleNavigate = createNavigationHandler(router);
    return <PrivacyPolicyPage onNavigate={handleNavigate} />;
}

