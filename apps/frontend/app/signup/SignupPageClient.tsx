'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SignupPage } from '@/components/SignupPage';
import { createNavigationHandler } from '@/lib/navigation-handler';

export function SignupPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const billingParam = searchParams.get('billing');
    const initialBilling: 'monthly' | 'annual' = billingParam === 'annual' ? 'annual' : 'monthly';
    const handleNavigate = createNavigationHandler(router);
    return <SignupPage onNavigate={handleNavigate} initialBilling={initialBilling} />;
}

