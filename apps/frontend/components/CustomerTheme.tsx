'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Route-scoped theme; admin and its body-mounted dialogs keep their own tokens. */
export function CustomerTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!pathname || pathname === '/admin' || pathname.startsWith('/admin/')) return <>{children}</>;
  const account = /^\/(login|signup|reset-password|forgot-password|verify-owner|verify-email-change|dashboard|account|mail|forwarding|billing|business-owners|settings|kyc)(?:\/|$)/.test(pathname);
  return <div data-customer-theme data-account-area={account ? 'true' : undefined} style={{ display: 'contents' }}>{children}</div>;
}
