'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
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
        { label: 'Help Centre', page: 'help', href: '/help' },
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

    const handleNavClick = (page: string, href?: string) => {
        // Scroll to top before navigation
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        if (href) {
            window.location.href = href;
        } else if (page === 'login') {
            window.location.href = '/login';
        } else if (page === 'signup') {
            window.location.href = '/signup';
        } else if (onNavigate) {
            onNavigate(page);
        } else {
            // Fallback: use window.location if onNavigate not provided
            window.location.href = `/${page}`;
        }
        setIsMenuOpen(false);
    };

    return (
        <header
            className={cn(
                "sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border/50"
            )}
        >
            <div className={cn(
                "safe-pad mx-auto flex max-w-[1440px] items-center justify-between px-6 sm:px-8 lg:px-16",
                isDashboard ? "py-2.5 md:py-4" : "py-4"
            )}>
                {/* Brand Name - Hidden on mobile in dashboard */}
                <div className={cn(isDashboard && "hidden md:block")}>
                    <VAHLogo
                        onNavigate={onNavigate}
                        size={isDashboard ? "md" : "lg"}
                    />
                </div>

                {/* Desktop Navigation */}
                {!isDashboard && (
                    <nav
                        aria-label="Main navigation"
                        className={cn(
                            "hidden md:flex gap-6 text-sm lg:text-base leading-tight text-muted-foreground"
                        )}
                    >
                        {navItems.map((item: any) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item.page, item.href)}
                                className="font-medium transition-colors hover:text-foreground"
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                )}

                {/* Auth Buttons / Sign Out */}
                <div className="hidden md:flex items-center gap-3">
                    {isDashboard ? (
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="flex items-center gap-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </Button>
                    ) : (
                        <>
                            <button
                                onClick={() => handleNavClick('login')}
                                className="text-sm lg:text-base leading-[1.2] font-medium transition-colors text-muted-foreground hover:text-foreground"
                            >
                                Login
                            </button>
                            <Button
                                onClick={() => handleNavClick('signup')}
                                className="rounded-full px-4 py-2 text-sm lg:text-base leading-[1.2] font-medium transition-all duration-200 bg-[#206039] text-white hover:bg-[#206039]/90"
                            >
                                Get started
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile menu button */}
                <div className="md:hidden">
                    <Button
                        variant="ghost"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="tt-min p-2"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-border/50 bg-background">
                    <div className="safe-pad pt-3 pb-5 space-y-1.5">
                        {isDashboard ? (
                            // Dashboard mobile - just sign out
                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                className="tt-min flex items-center gap-2 px-4 py-3 rounded-lg w-full text-left text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-background"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </Button>
                        ) : (
                            // Public site mobile navigation
                            <>
                                {navItems.map((item: any) => (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNavClick(item.page, item.href)}
                                        className="tt-min block w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-background"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                <div className="pt-4 space-y-3">
                                    <button
                                        onClick={() => handleNavClick('login')}
                                        className="tt-min w-full px-4 py-2 text-sm font-medium transition-colors text-center text-muted-foreground hover:text-foreground"
                                    >
                                        Login
                                    </button>
                                    <Button
                                        onClick={() => handleNavClick('signup')}
                                        className="tt-min w-full rounded-full font-medium transition-all duration-200 bg-[#206039] text-[#024E40] hover:bg-[#206039]/90"
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
