'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "./ui/button";
import { Menu, X, Home, Mail, User, HelpCircle } from "lucide-react";
import { VAHLogo } from "./VAHLogo";
import { cn } from "@/lib/utils";

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
        { label: 'Help Center', page: 'help', href: '/help' },
    ];

    const navItems = isDashboard ? dashboardNavItems : publicNavItems;
    const isMarketing = !isDashboard;

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
        <header
            className={cn(
                "sticky top-0 z-30",
                isMarketing
                    ? "bg-[#024E40]"
                    : "bg-background/80 backdrop-blur border-b border-border/50"
            )}
            style={
                isMarketing
                    ? {
                        fontFamily:
                            "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
                    }
                    : undefined
            }
        >
            <div className="safe-pad mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 sm:px-8 lg:px-16">
                {/* Brand Name */}
                <VAHLogo
                    onNavigate={onNavigate}
                    size={isDashboard ? "md" : "lg"}
                    imgClassName={isMarketing ? "brightness-0 invert" : undefined}
                />

                {/* Desktop Navigation */}
                <nav
                    aria-label="Main navigation"
                    className={cn(
                        "hidden md:flex gap-6 text-sm lg:text-base leading-tight",
                        isMarketing ? "text-white/80" : "text-muted-foreground"
                    )}
                >
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
                                className={cn(
                                    "font-medium transition-colors",
                                    isMarketing
                                        ? "hover:text-white"
                                        : "hover:text-foreground"
                                )}
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
                            onClick={() => handleNavClick('signup')}
                            className={cn(
                                "text-sm lg:text-base leading-[1.2] font-medium transition-colors",
                                isMarketing
                                    ? "text-white/80 hover:text-white"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Sign up
                        </button>
                        <button
                            onClick={() => handleNavClick('login')}
                            className={cn(
                                "text-sm lg:text-base leading-[1.2] font-medium transition-colors",
                                isMarketing
                                    ? "text-white/80 hover:text-white"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Login
                        </button>
                        <Button
                            onClick={() => handleNavClick('signup')}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm lg:text-base leading-[1.2] font-medium transition-all duration-200",
                                isMarketing
                                    ? "bg-[#40C46C] text-[#024E40] hover:bg-[#40C46C]/90"
                                    : ""
                            )}
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
                        className={cn(
                            "tt-min p-2",
                            isMarketing ? "text-white hover:bg-white/10" : ""
                        )}
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div
                    className={cn(
                        "md:hidden border-t",
                        isMarketing
                            ? "border-white/10 bg-[#024E40]"
                            : "border-border/50 bg-background"
                    )}
                >
                    <div className="safe-pad pt-3 pb-5 space-y-1.5">
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
                                        className={cn(
                                            "tt-min block w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-all",
                                            isMarketing
                                                ? "text-white/80 hover:text-white hover:bg-white/10"
                                                : "text-muted-foreground hover:text-foreground hover:bg-background"
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                <div className="pt-4 space-y-3">
                                    <button
                                        onClick={() => handleNavClick('signup')}
                                        className={cn(
                                            "tt-min w-full px-4 py-2 text-sm font-medium transition-colors text-center",
                                            isMarketing
                                                ? "text-white/80 hover:text-white"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Sign up
                                    </button>
                                    <button
                                        onClick={() => handleNavClick('login')}
                                        className={cn(
                                            "tt-min w-full px-4 py-2 text-sm font-medium transition-colors text-center",
                                            isMarketing
                                                ? "text-white/80 hover:text-white"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Login
                                    </button>
                                    <Button
                                        onClick={() => handleNavClick('signup')}
                                        className={cn(
                                            "tt-min w-full rounded-full font-medium transition-all duration-200",
                                            isMarketing
                                                ? "bg-[#40C46C] text-[#024E40] hover:bg-[#40C46C]/90"
                                                : ""
                                        )}
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
