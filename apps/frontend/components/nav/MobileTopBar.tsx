// components/nav/MobileTopBar.tsx
// Mobile-first top app bar with back button and actions

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface MobileTopBarProps {
    title: string;
    right?: React.ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    className?: string;
}

export function MobileTopBar({
    title,
    right,
    showBack = true,
    onBack,
    className,
}: MobileTopBarProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <header
            className={cn(
                'sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/80 backdrop-blur-md border-b border-border',
                'px-3 py-2 pt-[calc(0.5rem+var(--safe-top))]',
                className
            )}
        >
            <div className="flex items-center justify-between gap-2">
                {showBack ? (
                    <button
                        onClick={handleBack}
                        aria-label="Go back"
                        className={cn(
                            'min-w-[44px] min-h-[44px] p-2 -ml-2',
                            'rounded-lg hover:bg-black/5 dark:hover:bg-white/10',
                            'transition-colors',
                            'flex items-center justify-center',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                        )}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                ) : (
                    <div className="min-w-[44px]" />
                )}

                <h1 className="text-fluid-xl font-semibold truncate flex-1 text-center">
                    {title}
                </h1>

                <div className="min-w-[44px] flex justify-end">
                    {right}
                </div>
            </div>
        </header>
    );
}
