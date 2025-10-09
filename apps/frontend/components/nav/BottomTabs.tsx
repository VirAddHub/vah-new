// components/nav/BottomTabs.tsx
// Mobile-first bottom navigation tabs

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Mail, CreditCard, User, Search } from 'lucide-react';

interface TabItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const defaultTabs: TabItem[] = [
    {
        href: '/dashboard',
        label: 'Home',
        icon: <Home className="h-5 w-5" />,
    },
    {
        href: '/mail',
        label: 'Mail',
        icon: <Mail className="h-5 w-5" />,
    },
    {
        href: '/account',
        label: 'Account',
        icon: <User className="h-5 w-5" />,
    },
];

interface BottomTabsProps {
    tabs?: TabItem[];
    className?: string;
}

export function BottomTabs({ tabs = defaultTabs, className }: BottomTabsProps) {
    const pathname = usePathname();

    return (
        <nav
            className={cn(
                'fixed bottom-0 inset-x-0 z-40',
                'bg-white/95 dark:bg-neutral-900/90 backdrop-blur-md',
                'border-t border-border',
                'pb-[calc(0.5rem+var(--safe-bottom))]',
                'md:hidden', // Hide on desktop
                className
            )}
            role="navigation"
            aria-label="Mobile navigation"
        >
            <ul className="grid grid-cols-4 gap-1">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');

                    return (
                        <li key={tab.href} className="text-center">
                            <Link
                                href={tab.href}
                                className={cn(
                                    'flex flex-col items-center py-2 px-1',
                                    'text-xs leading-tight',
                                    'transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                    'rounded-lg',
                                    isActive
                                        ? 'text-primary font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <span
                                    className={cn(
                                        'mb-1 transition-transform',
                                        isActive && 'scale-110'
                                    )}
                                    aria-hidden="true"
                                >
                                    {tab.icon}
                                </span>
                                <span className="truncate max-w-full">{tab.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

// Spacer component to add padding when bottom tabs are visible
export function BottomTabsSpacer({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'h-[calc(4rem+var(--safe-bottom))] md:hidden',
                className
            )}
            aria-hidden="true"
        />
    );
}
