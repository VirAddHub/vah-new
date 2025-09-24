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
        { label: 'Login', page: 'dashboard' },
        { label: 'Admin', page: 'admin' },
    ];

    const handleNavClick = (page: string) => {
        if (page === 'dashboard' || page === 'admin') {
            window.location.href = '/login';
        } else {
            onNavigate(page);
        }
        setIsMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-border/50">
            <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => handleNavClick('home')}
                    className="hover:opacity-80 transition-opacity"
                >
                    <VAHLogo size="md" showText={true} />
                </button>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-8 text-sm text-muted-foreground">
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
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Log in
                    </button>
                    <Button
                        onClick={() => handleNavClick('signup')}
                        className="rounded-xl bg-primary px-4 py-2 text-white text-sm font-medium hover:bg-primary/90 shadow-soft"
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
                <div className="md:hidden animate-slide-up border-t border-border/50 bg-white">
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
