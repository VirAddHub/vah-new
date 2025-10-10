'use client';

import { useState } from 'react';
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import { VAHLogo } from "./VAHLogo";

interface NavigationProps {
    onNavigate: (page: string) => void;
}

export function Navigation({ onNavigate }: NavigationProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { label: 'Pricing', page: 'pricing' },
        { label: 'Blog', page: 'blog' },
        { label: 'About Us', page: 'about' },
        { label: 'Help', page: 'help' },
        { label: 'Sign Up', page: 'signup' },
    ];

    const handleNavClick = (page: string) => {
        if (page === 'login') {
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
            <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <VAHLogo href="/" size="sm" showText={false} />

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-8 text-sm lg:text-base leading-[1.2] text-muted-foreground">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => handleNavClick(item.page)}
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
                        className="rounded-xl bg-primary px-4 py-2 text-white text-sm lg:text-base leading-[1.2] font-medium hover:bg-primary/90 shadow-soft"
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
                    <div className="px-6 pt-4 pb-6 space-y-2">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item.page)}
                                className="block px-4 py-3 rounded-lg w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                            >
                                {item.label}
                            </button>
                        ))}
                        <div className="pt-4 space-y-3">
                            <button
                                onClick={() => handleNavClick('login')}
                                className="w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
                            >
                                Log in
                            </button>
                            <Button
                                onClick={() => handleNavClick('signup')}
                                className="w-full rounded-xl bg-primary text-white font-medium hover:bg-primary/90 shadow-soft"
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
