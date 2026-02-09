'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy route: Redirects to new public verification route
 * 
 * This route is kept for backward compatibility with existing email links.
 * New emails will use /verify-email-change
 */
export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    // Redirect to new public route, preserving token
    const newUrl = token 
      ? `/verify-email-change?token=${encodeURIComponent(token)}`
      : '/verify-email-change';
    router.replace(newUrl);
  }, [searchParams, router]);

  // Show loading state during redirect
  return null;
}

