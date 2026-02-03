'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "./ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { clearToken } from "@/lib/token-manager";
import { VAHLogo } from "./VAHLogo";
import { cn } from "@/lib/utils";
import { useDashboardView } from "@/contexts/DashboardViewContext";

interface NavigationProps {
    onNavigate?: (page: string) => void;
}

export function Navigation({ onNavigate }: NavigationProps = {}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Get mobile sidebar state from context (only available in dashboard)
    let setIsMobileSidebarOpen: ((open: boolean) => void) | null = null;
    try {
        const dashboardContext = useDashboardView();
        setIsMobileSidebarOpen = dashboardContext.setIsMobileSidebarOpen;
    } catch {
        // Not in dashboard context, that's fine
    }

    // Check if we're in dashboard context
    // Dashboard routes: /dashboard, /account, /mail, /forwarding, /billing
    const isDashboard = Boolean(pathname && (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/account') ||
        pathname.startsWith('/mail') ||
        pathname.startsWith('/forwarding') ||
        pathname.startsWith('/billing')
    ));

    // Public site navigation items
    // Standardized to "Help Centre" for consistency across all pages
    const publicNavItems = [
        { label: 'Pricing', page: 'pricing' },
        { label: 'Blog', page: 'blog' },
        { label: 'Help Centre', page: 'help' },
    ];

    const navItems = publicNavItems;

    // Debug: Log pathname and isDashboard (remove in production)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[Navigation] pathname:', pathname, 'isDashboard:', isDashboard);
    }

    const handleNavClick = (page: string) => {
        // Scroll to top before navigation
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        if (onNavigate) {
            onNavigate(page);
        } else {
            // Use router.push for client-side navigation (no page reload)
            router.push(`/${page}`);
        }
        setIsMenuOpen(false);
    };

    // Handle logout - use proper API endpoint
    const handleLogout = async () => {
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
            // Phase A: Clear client-side tokens (localStorage + CSRF cookie)
            clearToken();
            // Redirect to login page
            window.location.href = '/login';
        }
    };

    return (
        <div className="w-full h-full flex items-center">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
                <div className="flex items-center justify-between h-16">
                    {/* Mobile Dashboard: Hamburger on LEFT, Logo on RIGHT */}
                    {isDashboard ? (
                        <>
                            {/* Mobile Hamburger Menu (Dashboard Navigation) */}
                            {setIsMobileSidebarOpen && (
                                <button
                                    onClick={() => setIsMobileSidebarOpen(true)}
                                    className="md:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                                    aria-label="Open dashboard menu"
                                >
                                    <Menu className="h-5 w-5" strokeWidth={2} />
                                </button>
                            )}

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
                        </>
                    ) : (
                        <>
                            {/* Public Pages: Logo on LEFT */}
                            <VAHLogo onNavigate={onNavigate} size="lg" />

                            {/* Desktop Navigation */}
                            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
                                {navItems.map((item: any) => (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNavClick(item.page)}
                                        className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </nav>

                            {/* Desktop Auth */}
                            <div className="hidden md:flex items-center gap-4">
                                <button
                                    onClick={() => handleNavClick('login')}
                                    className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                                >
                                    Log in
                                </button>
                                <Button
                                    onClick={() => handleNavClick('signup')}
                                    size="sm"
                                    className="rounded-lg px-4 h-9"
                                >
                                    Get started
                                </Button>
                            </div>

                            {/* Mobile Menu Button (Public Pages) */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 -mr-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                            >
                                {isMenuOpen ? (
                                    <X className="h-5 w-5" strokeWidth={2} />
                                ) : (
                                    <Menu className="h-5 w-5" strokeWidth={2} />
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile Menu - Only for public pages (dashboard uses sidebar drawer) */}
            {isMenuOpen && !isDashboard && (
                <div className="md:hidden border-t border-neutral-200 bg-white">
                    <div className="px-6 py-6 space-y-1">
                        {navItems.map((item: any) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item.page)}
                                className="block w-full text-left px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}

                        <div className="pt-4 space-y-2 border-t border-neutral-200 mt-4">
                            <button
                                onClick={() => handleNavClick('login')}
                                className="block w-full text-center px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                            >
                                Log in
                            </button>
                            <Button
                                onClick={() => handleNavClick('signup')}
                                className="w-full rounded-lg h-10"
                            >
                                Get started
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
