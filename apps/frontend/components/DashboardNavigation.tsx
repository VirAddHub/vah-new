'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "./ui/button";
import { Menu, LogOut } from "lucide-react";
import { clearToken } from "@/lib/token-manager";
import { VAHLogo } from "./VAHLogo";
import { useDashboardView } from "@/contexts/DashboardViewContext";

/**
 * Dashboard top header — LAYOUT CONTRACT (do not break):
 * - One row: left section (hamburger + logo) | right section (Sign out).
 * - Use justify-between so logo stays left and Sign out stays right.
 * - Do NOT put logo in a "center" flex-1 slot (causes logo/sign out to shift).
 * - Logo: fixed height (h-8), width auto, object-contain. No flexible width.
 * - Sign out: always in the right section, shrink-0.
 * - Same max-width and horizontal padding as dashboard shell for alignment.
 */
interface DashboardNavigationProps {
    onNavigate?: (page: string) => void;
}

export function DashboardNavigation({ onNavigate }: DashboardNavigationProps = {}) {
    const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboardView();
    const router = useRouter();
    const pathname = usePathname();
    const hamburgerRef = useRef<HTMLButtonElement>(null);
    const prevIsOpenRef = useRef(isMobileSidebarOpen);
    const prevPathnameRef = useRef(pathname);

    useEffect(() => {
        if (prevIsOpenRef.current && !isMobileSidebarOpen) {
            if (pathname === prevPathnameRef.current) {
                hamburgerRef.current?.focus();
            }
        }
        prevIsOpenRef.current = isMobileSidebarOpen;
        prevPathnameRef.current = pathname;
    }, [isMobileSidebarOpen, pathname]);

    const handleLogout = async () => {
        if ((handleLogout as any).__isLoggingOut) return;
        (handleLogout as any).__isLoggingOut = true;

        try {
            await fetch('/api/bff/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            clearToken();
            localStorage.removeItem('vah_jwt');
            localStorage.removeItem('vah_user');
            document.cookie = 'vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            window.stop();
            setTimeout(() => window.location.replace('/login'), 200);
        }
    };

    return (
        <header className="w-full shrink-0 border-b border-neutral-200/80 bg-white">
            {/* Inner: same max-width/padding as dashboard shell; single row, justify-between */}
            <div className="mx-auto flex h-12 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 sm:h-16">
                {/* Left: hamburger (mobile only) + logo + wordmark. No min-w-0 so this section cannot collapse. */}
                <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                    <button
                        ref={hamburgerRef}
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="flex min-h-[44px] min-w-[44px] -ml-0.5 items-center justify-center rounded-md p-2 text-neutral-600 transition-colors hover:text-neutral-900 touch-manipulation lg:hidden"
                        aria-label="Open dashboard menu"
                    >
                        <Menu className="h-5 w-5 shrink-0" strokeWidth={2} />
                    </button>
                    <div className="flex h-8 min-h-[2rem] min-w-[140px] items-center gap-2 rounded-md border border-transparent bg-neutral-50/80 px-1 sm:px-2" data-dashboard-logo-slot>
                        <VAHLogo
                            onNavigate={onNavigate}
                            size="lg"
                            className="h-8 w-auto max-w-[180px] shrink-0"
                            imgClassName="h-8 w-auto max-w-full object-contain object-left"
                        />
                        <span className="text-sm font-semibold text-neutral-800 whitespace-nowrap sm:text-base" aria-hidden="true">
                            VirtualAddressHub
                        </span>
                    </div>
                </div>

                {/* Right: Sign out only. Shrink-0 so it never moves with logo width. */}
                <div className="flex shrink-0 items-center">
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        size="sm"
                        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 px-2.5 touch-manipulation sm:min-w-0 sm:px-3"
                        aria-label="Sign out"
                    >
                        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
                        <span className="hidden sm:inline">Sign out</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
