'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "./ui/button";
import { Menu, LogOut } from "lucide-react";
import { clearToken } from "@/lib/token-manager";
import { VAHLogo } from "./VAHLogo";
import { useDashboardView } from "@/contexts/DashboardViewContext";

interface DashboardNavigationProps {
    onNavigate?: (page: string) => void;
}

export function DashboardNavigation({ onNavigate }: DashboardNavigationProps = {}) {
    // Get mobile sidebar state from context
    const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboardView();
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
        <header className="w-full h-full flex items-center">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
                <div className="flex items-center justify-between h-16">
                    {/* Mobile Dashboard: Hamburger on LEFT, Logo on RIGHT */}

                    {/* Mobile Hamburger Menu (Dashboard Navigation) */}
                    <button
                        ref={hamburgerRef}
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                        aria-label="Open dashboard menu"
                    >
                        <Menu className="h-5 w-5" strokeWidth={2} />
                    </button>

                    {/* Desktop Logo (left side) */}
                    <div className="hidden md:block">
                        <VAHLogo onNavigate={onNavigate} size="lg" />
                    </div>

                    {/* Mobile Logo (right side) */}
                    <div className="md:hidden ml-auto">
                        <VAHLogo onNavigate={onNavigate} size="lg" />
                    </div>

                    {/* Desktop Auth - Sign out on desktop (lg+), mobile uses drawer */}
                    <div className="hidden lg:flex items-center gap-4">
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <LogOut className="h-4 w-4" strokeWidth={2} />
                            <span>Sign out</span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
