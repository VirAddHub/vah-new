'use client';

import { useState } from 'react';
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import { VAHLogo } from "./VAHLogo";
import { DarkModeToggle } from "./ui/theme";
import { AdvancedSearch } from "./ui/advanced-search";

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
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
            <div className="container-modern py-4 flex items-center justify-between">
                {/* Logo */}
                <VAHLogo href="/" size="md" showText={true} />

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-8 text-sm lg:text-base leading-[1.2] text-muted-foreground">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => handleNavClick(item.page)}
                            className="nav-link hover:text-foreground transition-colors font-medium"
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Desktop CTA */}
                <div className="hidden md:flex items-center gap-4">
                    {/* Advanced Search */}
                    <AdvancedSearch onNavigate={onNavigate} />
                    
                    {/* Dark Mode Toggle */}
                    <DarkModeToggle />
                    
                    <Button
                        variant="outline"
                        onClick={() => handleNavClick('login')}
                        className="btn-outline"
                    >
                        Login
                    </Button>
                    <Button
                        onClick={() => handleNavClick('signup')}
                        className="btn-primary"
                    >
                        Get Started
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md">
                    <div className="container-modern py-4 space-y-4">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavClick(item.page)}
                                className="block w-full text-left py-3 px-4 rounded-xl hover:bg-muted transition-colors font-medium"
                            >
                                {item.label}
                            </button>
                        ))}
                        <div className="pt-4 border-t border-border/50 space-y-3">
                            <Button
                                variant="outline"
                                onClick={() => handleNavClick('login')}
                                className="w-full btn-outline"
                            >
                                Login
                            </Button>
                            <Button
                                onClick={() => handleNavClick('signup')}
                                className="w-full btn-primary"
                            >
                                Get Started
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}