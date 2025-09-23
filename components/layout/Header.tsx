'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Mail, Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, isLoading } = useAuth();

    const navItems = [
        { label: 'How It Works', href: '/how-it-works' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Blog', href: '/blog' },
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const isDashboard = pathname.startsWith('/dashboard');

    if (isDashboard) {
        return null; // Dashboard has its own navigation
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                    <Mail className="h-7 w-7 text-primary" />
                    <span className="text-xl font-bold">VirtualAddressHub</span>
                </Link>

                <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                'text-muted-foreground transition-colors hover:text-foreground',
                                pathname === item.href && 'text-foreground'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center space-x-2">
                    {user ? (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                                {user.email}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/dashboard')}
                            >
                                <User className="w-4 h-4 mr-2" />
                                Dashboard
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                disabled={isLoading}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/login')}
                            >
                                Login
                            </Button>
                            <Button
                                onClick={() => router.push('/login')}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                Get Started
                            </Button>
                        </>
                    )}
                </div>

                <div className="md:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
            </div>

            {isMenuOpen && (
                <div className="md:hidden p-4 space-y-2 border-t">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                'block px-3 py-2 rounded-md text-base font-medium transition-colors',
                                pathname === item.href
                                    ? 'text-foreground bg-accent'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}

                    <div className="pt-4 border-t space-y-2">
                        {user ? (
                            <>
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    {user.email}
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        router.push('/dashboard');
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <User className="w-4 h-4 mr-2" />
                                    Dashboard
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        handleLogout();
                                        setIsMenuOpen(false);
                                    }}
                                    disabled={isLoading}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        router.push('/login');
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Login
                                </Button>
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        router.push('/login');
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    Get Started
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
