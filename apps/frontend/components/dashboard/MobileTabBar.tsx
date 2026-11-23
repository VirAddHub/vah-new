'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, Mail, Send, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccess, NEXT_STEP_PATH } from '@/hooks/useAccess';
import { isOnboardingPath } from '@/components/OnboardingGate';

const TABS = [
  { href: '/mail', label: 'Mail', icon: Mail, match: (p: string) => p.startsWith('/mail') },
  { href: '/forwarding', label: 'Forwarding', icon: Send, match: (p: string) => p.startsWith('/forwarding') },
  { href: '/account/overview', label: 'Account', icon: User, match: (p: string) => p.startsWith('/account') || p.startsWith('/business-owners') },
];

/**
 * Bottom bar on small screens: the three places customers go most.
 * While setup is unfinished, tabs that need full service show a lock and take the customer
 * to their next setup step, so nothing looks clickable and then silently bounces.
 */
export function MobileTabBar() {
  const pathname = usePathname() || '';
  const { access } = useAccess();
  const restricted = !!access && !access.isAdmin && access.level !== 'full';
  const nextStep = access ? NEXT_STEP_PATH[access.next] : '/account';

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          const target = restricted && href === '/account/overview' ? '/account' : href;
          const locked = restricted && !isOnboardingPath(target);
          return (
            <li key={href}>
              <Link
                href={locked ? nextStep : target}
                aria-current={active ? 'page' : undefined}
                aria-label={locked ? `${label}: opens once your account setup is complete` : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors', active && 'bg-green-soft text-green-ink')}>
                  {locked ? <Lock className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /> : <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} aria-hidden />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
