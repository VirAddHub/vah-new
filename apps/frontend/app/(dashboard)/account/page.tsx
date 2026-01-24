'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering - this page redirects
export const dynamic = 'force-dynamic';

export default function AccountPage() {
    const router = useRouter();

    // Redirect to overview page
    useEffect(() => {
        router.replace('/account/overview');
    }, [router]);

    return null;
}
