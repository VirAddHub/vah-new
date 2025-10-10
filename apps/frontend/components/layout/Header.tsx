"use client";

import { useState } from 'react';
import { Button } from "../ui/button";
import { Menu, X } from "lucide-react";
import { VAHLogo } from "../VAHLogo";

interface HeaderProps {
    onNavigate?: (page: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { label: 'Pricing', page: 'pricing' },
        { label: 'Blog', page: 'blog' },
        { label: 'About Us', page: 'about' },
        { label: 'Help', page: 'help' },
        { label: 'User Dashboard', page: 'dashboard' },
        { label: 'Admin Portal', page: 'admin' },
    ];

    const handleNavClick = (page: string) => {
        onNavigate?.(page);
        setIsMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border/50">
            <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <VAHLogo onNavigate={onNavigate} size="lg" showText={false} />

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
                    <Button
                        onClick={() => handleNavClick('login')}
                        className="rounded-md bg-primary px-4 py-2 text-white text-sm font-medium hover:bg-primary/90"
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
                        <div className="pt-4">
                            <Button
                                onClick={() => handleNavClick('login')}
                                className="w-full rounded-md bg-primary text-white font-medium hover:bg-primary/90"
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
