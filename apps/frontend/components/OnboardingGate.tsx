'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAccess, NEXT_STEP_PATH } from '@/hooks/useAccess';

/**
 * Pages a signed-in customer can always use to finish onboarding or fix a problem.
 * Everything else under the dashboard is the service itself (mail, scans, forwarding, the
 * registered address and certificate) and needs full service. The backend enforces the same rule
 * on every route; this gate only decides what to show.
 */
const ONBOARDING_PATHS = [
  '/account/billing',
  '/account/verification',
  '/account/support',
  '/account/settings',
  '/account/businesses',
  '/account/confirm-email',
  '/business-owners',
];

const isOnboardingPath = (pathname: string) =>
  pathname === '/account' || ONBOARDING_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { access, unauthenticated, isLoading, error, refresh } = useAccess();
  const pathname = usePathname() || '';
  const router = useRouter();

  const restricted = !!access && !access.isAdmin && access.level !== 'full';
  const blockedHere = restricted && !isOnboardingPath(pathname);
  const target = access ? NEXT_STEP_PATH[access.next] : '/login';

  useEffect(() => {
    if (isLoading) return;
    if (unauthenticated || access?.level === 'none') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (blockedHere) router.replace(target);
  }, [isLoading, unauthenticated, access?.level, blockedHere, target, pathname, router]);

  if (error && !access) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
        <p className="text-body text-foreground">We could not load your account. Please try again.</p>
        <button type="button" onClick={() => void refresh()} className="h-11 rounded-full bg-foreground px-6 text-body-sm font-medium text-background">
          Try again
        </button>
      </div>
    );
  }

  if (isLoading || !access || unauthenticated || access.level === 'none' || blockedHere) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading your account">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}
