'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "./ui/button";
import { Menu, LogOut } from "lucide-react";
import { clearToken } from "@/lib/token-manager";
import { VAHLogo } from "./VAHLogo";
import { useDashboardView } from "@/contexts/DashboardViewContext";

interface DashboardNavigationProps {
    onNavigate?: (page: string) => void;
}

export function DashboardNavigation({ onNavigate }: DashboardNavigationProps = {}) {
    // Get mobile sidebar state from context (only available in dashboard)
    // We can assume we are in dashboard context here as this component is for dashboard
    const { setIsMobileSidebarOpen } = useDashboardView();
    const router = useRouter();

    // Handle logout - use proper API endpoint
    const handleLogout = async () => {
        try {
            // Call logout API endpoint - backend will clear httpOnly cookies
            await fetch('/api/bff/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Clear client-side tokens (localStorage + CSRF cookie)
            clearToken();
            // Redirect to login page
            window.location.href = '/login';
        }
    };

    return (
        <header className="w-full h-full flex items-center">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
                <div className="flex items-center justify-between h-16">
                    {/* Mobile Dashboard: Hamburger on LEFT, Logo on RIGHT */}

                    {/* Mobile Hamburger Menu (Dashboard Navigation) */}
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                        aria-label="Open dashboard menu"
                    >
                        <Menu className="h-5 w-5" strokeWidth={2} />
                    </button>

                    {/* Desktop Logo (left side) */}
                    <div className="hidden md:block">
                        <VAHLogo onNavigate={onNavigate} size="lg" />
                    </div>

                    {/* Mobile Logo (right side) */}
                    <div className="md:hidden ml-auto">
                        <VAHLogo onNavigate={onNavigate} size="lg" />
                    </div>

                    {/* Desktop Auth - Sign out on desktop (lg+), mobile uses drawer */}
                    <div className="hidden lg:flex items-center gap-4">
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <LogOut className="h-4 w-4" strokeWidth={2} />
                            <span>Sign out</span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
