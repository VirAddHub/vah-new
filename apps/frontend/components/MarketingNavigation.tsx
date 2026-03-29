"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import { VAHLogo } from "./VAHLogo";

interface MarketingNavigationProps {
    onNavigate?: (page: string) => void;
}

/**
 * Marketing Navigation Header
 * 
 * Design principles:
 * - Minimal, clean, precise
 * - Subtle backdrop blur for depth
 * - Consistent spacing (16px/24px)
 * - Restrained hover states
 * - No visual noise
 */
export function MarketingNavigation({ onNavigate }: MarketingNavigationProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    const navItems = [
        { label: 'Pricing', page: 'pricing' },
        { label: 'Blog', page: 'blog' },
        { label: 'Help Centre', page: 'help' },
    ];

    /** Real Next.js routes so links work from the homepage SPA and from marketing layouts. */
    const handleNavClick = (page: string) => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        setIsMenuOpen(false);

        const path =
            page === 'home'
                ? '/'
                : page === 'kyc' || page === 'kyc-policy'
                  ? '/kyc'
                  : `/${page}`;
        router.push(path);
    };

    return (
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-3 min-w-0">
                    {/* Logo: visible on all breakpoints; tighter on phone, full height from sm */}
                    <div className="flex min-h-10 min-w-0 max-w-[min(100%,12rem)] flex-1 shrink items-center sm:min-w-[180px] sm:max-w-none sm:flex-none sm:min-h-[50px]">
                        <VAHLogo
                            onNavigate={onNavigate}
                            size="lg"
                            className="min-w-0 max-w-full"
                            imgClassName="!h-9 !max-h-9 w-auto max-w-full object-contain object-left sm:!h-[50px] sm:!max-h-[50px] sm:max-w-[200px]"
                        />
                    </div>

                    {/* Desktop Navigation */}
                    <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item.page)}
                                className="text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => handleNavClick('login')}
                            className="text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
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
                <div className="md:hidden border-t border-border bg-card">
                    <div className="px-6 py-6 space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item.page)}
                                className="block w-full text-left px-3 py-2 text-body-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}

                        <div className="pt-4 space-y-2 border-t border-border mt-4">
                            <button
                                onClick={() => handleNavClick('login')}
                                className="block w-full text-center px-3 py-2 text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
