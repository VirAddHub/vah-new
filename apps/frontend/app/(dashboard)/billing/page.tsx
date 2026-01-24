'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Force dynamic rendering - this page uses useSearchParams and redirects
export const dynamic = 'force-dynamic';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = new URLSearchParams(searchParams.toString());
    const suffix = qs.toString();
    router.replace(suffix ? `/account?${suffix}` : '/account');
  }, [router, searchParams]);

  return null;
}
