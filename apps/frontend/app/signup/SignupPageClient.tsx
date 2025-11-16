'use client';

import { useRouter } from 'next/navigation';
import { SignupPage } from '@/components/SignupPage';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function SignupPageClient() {
    const router = useRouter();
    const handleNavigate = createNavigationHandler(router);
    return <SignupPage onNavigate={handleNavigate} />;
}

