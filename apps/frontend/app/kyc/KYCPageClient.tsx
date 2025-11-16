'use client';

import { useRouter } from 'next/navigation';
import { KYCPolicyPage } from '@/components/KYCPolicyPage';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function KYCPageClient() {
    const router = useRouter();
    const handleNavigate = createNavigationHandler(router);
    return <KYCPolicyPage onNavigate={handleNavigate} />;
}

