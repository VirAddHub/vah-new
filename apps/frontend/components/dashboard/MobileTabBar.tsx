'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Send, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/mail', label: 'Mail', icon: Mail, match: (p: string) => p.startsWith('/mail') },
  { href: '/forwarding', label: 'Forwarding', icon: Send, match: (p: string) => p.startsWith('/forwarding') },
  { href: '/account/overview', label: 'Account', icon: User, match: (p: string) => p.startsWith('/account') || p.startsWith('/business-owners') },
];

/** Bottom bar on small screens: the three places customers go most. */
export function MobileTabBar() {
  const pathname = usePathname() || '';
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined}
                className={cn('flex h-14 flex-col items-center justify-center gap-0.5 text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                  active ? 'font-semibold text-ink' : 'text-graphite')}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
