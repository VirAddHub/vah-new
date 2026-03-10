'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "./ui/button";
import { Menu, LogOut, ChevronDown, Building2 } from "lucide-react";
import { clearToken } from "@/lib/token-manager";
import { VAHLogo } from "./VAHLogo";
import { useDashboardView } from "@/contexts/DashboardViewContext";
import { useActiveBusiness } from "@/contexts/ActiveBusinessContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardNavigationProps {
    onNavigate?: (page: string) => void;
}

export function DashboardNavigation({ onNavigate }: DashboardNavigationProps = {}) {
    const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboardView();
    const { businesses, activeBusiness, activeBusinessId, setActiveBusinessId, isLoading } = useActiveBusiness();
    const router = useRouter();
    const pathname = usePathname();
    const hamburgerRef = useRef<HTMLButtonElement>(null);
    const prevIsOpenRef = useRef(isMobileSidebarOpen);
    const prevPathnameRef = useRef(pathname);

    // Focus Restoration
    useEffect(() => {
        // If sidebar was open and now is closed
        if (prevIsOpenRef.current && !isMobileSidebarOpen) {
            // And we happen to be on the same page (didn't navigate away)
            if (pathname === prevPathnameRef.current) {
                hamburgerRef.current?.focus();
            }
        }

        // Update refs
        prevIsOpenRef.current = isMobileSidebarOpen;
        prevPathnameRef.current = pathname;
    }, [isMobileSidebarOpen, pathname]);

    // Handle logout - use proper API endpoint
    const handleLogout = async () => {
        // Prevent multiple logout attempts
        if ((handleLogout as any).__isLoggingOut) {
            return;
        }
        (handleLogout as any).__isLoggingOut = true;

        try {
            // Call logout API endpoint - backend will clear httpOnly cookies
            await fetch('/api/bff/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Clear client-side tokens (localStorage + CSRF cookie)
            clearToken();
            // Clear all localStorage items related to auth
            localStorage.removeItem('vah_jwt');
            localStorage.removeItem('vah_user');
            // Force clear cookies client-side as well
            document.cookie = 'vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
            
            // Use replace with a longer delay to ensure everything is cleared
            // Stop any ongoing requests by navigating immediately
            window.stop(); // Stop any pending requests
            setTimeout(() => {
                window.location.replace('/login');
            }, 200);
        }
    };

    return (
        <header className="w-full border-b bg-white">
            <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 min-w-0">
                {/* Left section: Hamburger (mobile) + Logo */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Mobile Hamburger Menu (Dashboard Navigation) */}
                    <button
                        ref={hamburgerRef}
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="lg:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Open dashboard menu"
                    >
                        <Menu className="h-5 w-5" strokeWidth={2} />
                    </button>

                    {/* Logo - Left aligned on both mobile and desktop */}
                    <VAHLogo onNavigate={onNavigate} size="lg" />
                </div>

                {/* Right section: Active business switcher + Sign out */}
                <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                    {!isLoading && businesses.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2 min-w-0 max-w-[160px] sm:max-w-[240px] shrink"
                                >
                                    <Building2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                                    <span className="truncate">
                                        {activeBusiness?.company_name ?? 'Active business'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[220px]">
                                {businesses.map((b) => (
                                    <DropdownMenuItem
                                        key={b.id}
                                        onClick={() => setActiveBusinessId(b.id)}
                                        className={activeBusinessId === b.id ? 'bg-accent' : ''}
                                    >
                                        <span className="truncate">{b.company_name}</span>
                                        {b.is_primary && (
                                            <span className="ml-2 text-xs text-muted-foreground">Primary</span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 shrink-0"
                    >
                        <LogOut className="h-4 w-4" strokeWidth={2} />
                        <span className="hidden sm:inline">Sign out</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
