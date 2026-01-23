'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();

    // Redirect to account overview (main page)
    useEffect(() => {
        router.replace('/account/overview');
    }, [router]);

    return null;
}
