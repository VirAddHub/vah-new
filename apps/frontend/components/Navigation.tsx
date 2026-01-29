'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "./ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { VAHLogo } from "./VAHLogo";
import { cn } from "@/lib/utils";

interface NavigationProps {
    onNavigate?: (page: string) => void;
}

export function Navigation({ onNavigate }: NavigationProps = {}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

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

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('vah_jwt');
        localStorage.removeItem('vah_user');
        document.cookie = 'vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/login';
    };

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

    return (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-neutral-200">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <VAHLogo onNavigate={onNavigate} size="lg" />

                    {/* Desktop Navigation */}
                    {!isDashboard && (
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
                    )}

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-4">
                        {isDashboard ? (
                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                className="flex items-center gap-2 text-sm font-medium transition-colors text-neutral-600 hover:text-neutral-900"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </Button>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
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
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-neutral-200 bg-white">
                    <div className="px-6 py-6 space-y-1">
                        {isDashboard ? (
                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </Button>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
