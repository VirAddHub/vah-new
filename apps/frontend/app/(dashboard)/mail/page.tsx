'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page redirects /mail to /dashboard?view=mail
export default function MailRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard?view=mail');
    }, [router]);

    return null;
}
