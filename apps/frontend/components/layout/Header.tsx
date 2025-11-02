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
        { label: 'Help', page: 'help' },
    ];

    const handleNavClick = (page: string) => {
        onNavigate?.(page);
        setIsMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border/50">
            <div className="safe-pad mx-auto max-w-screen-xl py-4 flex items-center justify-between">
                {/* Logo */}
                <VAHLogo onNavigate={onNavigate} size="lg" showText={true} />

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
                        onClick={() => handleNavClick('signup')}
                        className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--primary-hover))] hover:shadow-md hover:scale-105 transition-all duration-200"
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
                                onClick={() => handleNavClick(item.page)}
                                className="block px-4 py-3 rounded-lg w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                            >
                                {item.label}
                            </button>
                        ))}
                        <div className="pt-4">
                            <Button
                                onClick={() => handleNavClick('signup')}
                                className="w-full rounded-md bg-primary text-primary-foreground font-medium hover:bg-[hsl(var(--primary-hover))] hover:shadow-md transition-all duration-200"
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
