'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function BillingRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = new URLSearchParams();
    for (const [k, v] of Array.from(searchParams.entries())) {
      qs.set(k, v);
    }
    const suffix = qs.toString();
    router.replace(suffix ? `/account?${suffix}` : "/account");
  }, [router, searchParams]);

  return null;
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingRedirect />
    </Suspense>
  );
}
