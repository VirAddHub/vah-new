'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const PAYMENT_REQUIRED_REDIRECT = '/account/billing';

const ALLOWED_WHILE_UNPAID = [
  '/account/billing',
  '/account/support',
  '/account/verification',
];

/**
 * Wraps dashboard routes. If the user is authenticated but has not completed
 * payment (plan_status is not "active"), they are redirected to billing.
 * Admin users bypass the gate entirely.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      setChecked(true);
      return;
    }

    if (isAdmin) {
      setChecked(true);
      return;
    }

    const planStatus = (user as any).plan_status;
    const isPaid = planStatus === 'active';

    if (!isPaid && !ALLOWED_WHILE_UNPAID.some(p => pathname.startsWith(p))) {
      router.replace(PAYMENT_REQUIRED_REDIRECT);
      return;
    }

    setChecked(true);
  }, [isLoading, isAuthenticated, user, isAdmin, pathname, router]);

  if (isLoading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
