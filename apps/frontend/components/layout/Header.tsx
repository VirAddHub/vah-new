"use client";

import { useState } from 'react';
import { Button } from "../ui/button";
import { Menu, X } from "lucide-react";

interface HeaderProps {
    onNavigate?: (page: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { label: 'Pricing', page: 'pricing' },
        { label: 'Blog', page: 'blog' },
        { label: 'Compliance Check', page: 'compliance-check', href: '/compliance-check' },
        { label: 'Help', page: 'help', href: '/help' },
        { label: 'Sign Up', page: 'signup' },
    ];

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
            onNavigate?.(page);
        }
        setIsMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border/50">
            <div className="safe-pad mx-auto max-w-screen-xl py-4 flex items-center justify-between">
                {/* Brand Name */}
                <button
                    onClick={() => onNavigate?.('home')}
                    className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
                >
                    VirtualAddress<span className="text-primary">Hub</span>
                </button>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-8 text-sm lg:text-base leading-[1.2] text-muted-foreground">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => handleNavClick(item.page, (item as any).href)}
                            className="hover:text-foreground transition-colors font-medium"
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Auth Buttons */}
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

                {/* Mobile menu button */}
                <div className="md:hidden">
                    <Button
                        variant="ghost"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
            </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-border/50 bg-background">
                        <div className="safe-pad pt-4 pb-6 space-y-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => handleNavClick(item.page, (item as any).href)}
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
                        </div>
                    </div>
                )}
        </header>
    );
}
