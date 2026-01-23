'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page redirects /forwarding to /dashboard?view=forwarding
export default function ForwardingRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard?view=forwarding');
    }, [router]);

    return null;
}
