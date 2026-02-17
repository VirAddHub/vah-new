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
        { label: 'Contact us', page: 'contact' },
    ];

    const handleNavClick = (page: string) => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        if (onNavigate) {
            onNavigate(page);
        } else {
            // Fallback: use router.push for client-side navigation
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
                    <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
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
                        {navItems.map((item) => (
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
