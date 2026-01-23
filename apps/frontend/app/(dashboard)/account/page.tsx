'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
    const router = useRouter();

    // Redirect to overview page
    useEffect(() => {
        router.replace('/account/overview');
    }, [router]);

    return null;
}
