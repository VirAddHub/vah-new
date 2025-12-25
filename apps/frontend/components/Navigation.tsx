'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "./ui/button";
import { Menu, X, Home, Mail, User, HelpCircle } from "lucide-react";
import { VAHLogo } from "./VAHLogo";

interface NavigationProps {
    onNavigate: (page: string) => void;
}

export function Navigation({ onNavigate }: NavigationProps) {
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

    // Dashboard navigation items
    const dashboardNavItems = [
        { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-4 w-4" /> },
        { label: 'Mail', href: '/mail', icon: <Mail className="h-4 w-4" /> },
        { label: 'Account', href: '/account', icon: <User className="h-4 w-4" /> },
        { label: 'Help', href: '/help', icon: <HelpCircle className="h-4 w-4" /> },
    ];

    // Public site navigation items
    const publicNavItems = [
        { label: 'Pricing', page: 'pricing' },
        { label: 'Blog', page: 'blog' },
        { label: 'Help', page: 'help', href: '/help' },
        { label: 'Sign Up', page: 'signup' },
    ];

    const navItems = isDashboard ? dashboardNavItems : publicNavItems;

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
        } else {
            onNavigate(page);
        }
        setIsMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border/50">
            <div className="safe-pad mx-auto max-w-screen-xl py-4 flex items-center justify-between">
                {/* Brand Name */}
                <VAHLogo onNavigate={onNavigate} size="md" />

                {/* Desktop Navigation */}
                <nav aria-label="Main navigation" className="hidden md:flex gap-6 text-sm lg:text-base leading-[1.2] text-muted-foreground">
                    {isDashboard ? (
                        // Dashboard navigation with icons
                        navItems.map((item: any) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex items-center gap-2 hover:text-foreground transition-colors font-medium ${
                                    pathname === item.href ? 'text-foreground' : ''
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        ))
                    ) : (
                        // Public site navigation
                        navItems.map((item: any) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item.page, item.href)}
                                className="hover:text-foreground transition-colors font-medium"
                            >
                                {item.label}
                            </button>
                        ))
                    )}
                </nav>

                {/* Auth Buttons - Only show on public pages */}
                {!isDashboard && (
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => handleNavClick('login')}
                            className="text-sm lg:text-base leading-[1.2] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Log in
                        </button>
                        <Button
                            onClick={() => handleNavClick('signup')}
                            className="rounded-md px-4 py-2 text-sm lg:text-base leading-[1.2] font-medium transition-all duration-200"
                        >
                            Get started
                        </Button>
                    </div>
                )}

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
                    <div className="safe-pad pt-4 pb-6 space-y-2">
                        {isDashboard ? (
                            // Dashboard mobile navigation with icons
                            navItems.map((item: any) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`tt-min flex items-center gap-2 px-4 py-3 rounded-lg w-full text-left text-sm font-medium transition-all ${
                                        pathname === item.href
                                            ? 'text-foreground bg-muted'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background'
                                    }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            ))
                        ) : (
                            // Public site mobile navigation
                            <>
                                {navItems.map((item: any) => (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNavClick(item.page, item.href)}
                                        className="tt-min block px-4 py-3 rounded-lg w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                <div className="pt-4 space-y-3">
                                    <button
                                        onClick={() => handleNavClick('login')}
                                        className="tt-min w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
                                    >
                                        Log in
                                    </button>
                                    <Button
                                        onClick={() => handleNavClick('signup')}
                                        className="tt-min w-full rounded-md font-medium transition-all duration-200"
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
