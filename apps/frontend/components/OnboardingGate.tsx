'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Lock } from 'lucide-react';
import { useAccess, NEXT_STEP_PATH, type AccessDecision } from '@/hooks/useAccess';

/**
 * Pages a signed-in customer can always use to finish onboarding or fix a problem.
 * Everything else under the dashboard is the service itself (mail, scans, forwarding, the
 * registered address and certificate) and needs full service. The backend enforces the same rule
 * on every route; this gate only decides what to show.
 */
const ONBOARDING_PATHS = [
  '/account/overview',
  '/account/billing',
  '/account/verification',
  '/account/support',
  '/account/settings',
  '/account/businesses',
  '/account/confirm-email',
  '/business-owners',
];

export const isOnboardingPath = (pathname: string) =>
  pathname === '/account' || ONBOARDING_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { access, unauthenticated, isLoading, error, refresh } = useAccess();
  const pathname = usePathname() || '';
  const router = useRouter();

  // Pages that need full service are no longer redirected away (that read as the dashboard
  // "not responding"). They render inside the dashboard with a locked panel instead: see
  // RestrictedContent below.
  useEffect(() => {
    if (isLoading) return;
    if (unauthenticated || access?.level === 'none') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, unauthenticated, access?.level, pathname, router]);

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

  if (isLoading || !access || unauthenticated || access.level === 'none') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading your account">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}

/** True when this signed-in customer may not open this page yet. Admins are never restricted. */
export function isBlockedPath(access: AccessDecision | null, pathname: string) {
  return !!access && !access.isAdmin && access.level !== 'full' && !isOnboardingPath(pathname);
}

const PAGE_NAMES: Array<[string, string]> = [
  ['/mail', 'Your mail inbox'],
  ['/forwarding', 'Mail forwarding'],
  ['/account/addresses', 'Your registered address'],
];

/**
 * Wraps the page body. On a page that needs full service, while the account is restricted, the page
 * itself is not rendered (so it never asks the API for mail details); a short locked panel is shown
 * under the "Finish setting up" notice, with a button to the next step.
 */
export function RestrictedContent({ children }: { children: React.ReactNode }) {
  const { access } = useAccess();
  const pathname = usePathname() || '';
  if (!access || !isBlockedPath(access, pathname)) return <>{children}</>;
  const name = PAGE_NAMES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? 'This page';
  const target = NEXT_STEP_PATH[access.next] || '/account/overview';
  return (
    <section aria-labelledby="restricted-title" className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <h2 id="restricted-title" className="text-body font-semibold text-foreground">{name} opens once setup is complete</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">Finish the steps above and this page will open straight away.</p>
          <Link href={target} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-body-sm font-medium text-background hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
            Go to next step
          </Link>
        </div>
      </div>
    </section>
  );
}
