'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Mail,
    CreditCard,
    MapPin,
    ShieldCheck,
    HelpCircle,
    LayoutDashboard,
    Menu,
    X,
    LogOut,
    type LucideIcon
} from 'lucide-react';
import { clearToken } from "@/lib/token-manager";
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { useProfile } from '@/hooks/useDashboardData';

// Lazy load CertificateDownload to avoid unnecessary bundle size
// Only load when sidebar is rendered (not on every page)
const CertificateDownload = dynamic(
    () => import('./CertificateDownload').then(mod => ({ default: mod.CertificateDownload })),
    { ssr: false }
);

/**
 * Premium Dashboard Sidebar
 * 
 * Design principles from design-system.ts:
 * - Clean, minimal navigation
 * - Consistent spacing (12px/16px/24px)
 * - Subtle active states
 * - lucide-react icons with strokeWidth={2}
 */

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
}

interface NavSection {
    title?: string;
    items: NavItem[];
}

const mainNavItems: NavItem[] = [
    { label: 'Mail Inbox', href: '/mail', icon: Mail },
];

const accountNavItems: NavItem[] = [
    { label: 'Overview', href: '/account/overview', icon: LayoutDashboard },
    { label: 'Billing', href: '/account/billing', icon: CreditCard },
    { label: 'Addresses', href: '/account/addresses', icon: MapPin },
    { label: 'Verification', href: '/account/verification', icon: ShieldCheck },
    { label: 'Support', href: '/account/support', icon: HelpCircle },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboardView();
    const [isMobile, setIsMobile] = useState(false);
    
    // Fetch profile data once (shared across dashboard, no duplicate fetches)
    // This data is used by CertificateDownload component
    const { data: profileData } = useProfile();
    const profile = profileData?.data;

    // Handle logout - use proper API endpoint
    // Export this so DashboardHeader can use it
    const handleLogout = async () => {
        // Close mobile sidebar first (before async operations)
        if (setIsMobileSidebarOpen) {
            setIsMobileSidebarOpen(false);
        }

        try {
            // Call logout API endpoint - backend will clear httpOnly cookies
            await fetch('/api/bff/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // Clear client-side tokens (localStorage + CSRF cookie)
            clearToken();
            // Redirect to login page
            window.location.href = '/login';
        }
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close sidebar when route changes on mobile
    useEffect(() => {
        if (isMobile) {
            setIsMobileSidebarOpen(false);
        }
    }, [pathname, isMobile, setIsMobileSidebarOpen]);

    const isActive = (href: string) => {
        if (href === '/account/overview') {
            return pathname === '/account/overview' || pathname === '/account' || pathname === '/dashboard';
        }
        return pathname === href || pathname?.startsWith(href + '/');
    };

    // Handle Mail navigation
    const handleMailClick = () => {
        router.push('/mail');
        if (isMobile) {
            setIsMobileSidebarOpen(false);
        }
    };

    // Check if mail is active based on pathname
    const isMailActive = pathname === '/mail' || pathname === '/mail/';

    const SidebarContent = () => (
        <aside className="hidden lg:flex lg:w-[240px] lg:flex-shrink-0 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:border-r lg:border-neutral-200 bg-white">
            <div className="flex h-[calc(100dvh-4rem)] flex-col w-full">
                {/* Nav area - scrollable if needed */}
                <nav className="flex-1 overflow-y-auto px-4 py-4">
                    {/* Main Navigation */}
                    <div className="mb-4">
                        <div className="space-y-1">
                            {/* Mail Inbox */}
                            <button
                                onClick={handleMailClick}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full",
                                    isMailActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                )}
                            >
                                <Mail className="w-5 h-5" strokeWidth={2} />
                                Mail Inbox
                            </button>
                        </div>
                    </div>

                    {/* Account Section */}
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                        <div className="px-3 mb-2">
                            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Account
                            </h3>
                        </div>
                        <div className="space-y-1">
                            {accountNavItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                        )}
                                    >
                                        <Icon className="w-5 h-5" strokeWidth={2} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                {/* Certificate Download - Pinned to bottom */}
                {/* Pass profile data to avoid duplicate fetch */}
                <div className="shrink-0 bg-white">
                    <CertificateDownload profile={profile} />
                </div>
            </div>
        </aside>
    );

    // Accessibility: Scroll Lock
    useEffect(() => {
        if (isMobileSidebarOpen && isMobile) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileSidebarOpen, isMobile]);

    // Accessibility: Escape Key to Close
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (isMobileSidebarOpen && e.key === 'Escape') {
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

    // Accessibility: Focus Trap - using global listener for simplicity in this refactor
    useEffect(() => {
        if (!isMobileSidebarOpen) return;

        const handleTrap = (e: KeyboardEvent) => {
            const node = document.getElementById('mobile-sidebar-drawer');
            if (!node) return;

            if (e.key === 'Tab') {
                const focusableElements = node.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleTrap);
        return () => window.removeEventListener('keydown', handleTrap);
    }, [isMobileSidebarOpen]);

    // Focus initial element on open
    useEffect(() => {
        if (isMobileSidebarOpen) {
            // Small timeout to ensure DOM is rendered
            setTimeout(() => {
                const closeBtn = document.querySelector('[aria-label="Close menu"]') as HTMLElement;
                if (closeBtn) closeBtn.focus();
            }, 50);
        }
    }, [isMobileSidebarOpen]);


    return (
        <>
            <SidebarContent />

            {/* Mobile Sidebar Overlay & Drawer */}
            {isMobile && isMobileSidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setIsMobileSidebarOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        id="mobile-sidebar-drawer"
                        className="fixed left-0 top-0 h-[100dvh] z-50 lg:hidden w-[280px] max-w-[85vw]"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation Menu"
                    >
                        <div className="flex h-[100dvh] flex-col bg-white shadow-xl">
                            {/* Header - Fixed at top */}
                            <div className="shrink-0 flex items-center justify-between p-6 border-b border-neutral-200">
                                <h2 className="text-lg font-semibold text-neutral-900">Menu</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    className="h-8 w-8"
                                    aria-label="Close menu"
                                >
                                    <X className="h-5 w-5" strokeWidth={2} />
                                </Button>
                            </div>

                            {/* Nav area - Scrollable */}
                            <div className="flex-1 overflow-y-auto px-4 py-4">
                                {/* Main Navigation */}
                                <div className="mb-4">
                                    <div className="space-y-1">
                                        {/* Mail Inbox */}
                                        <button
                                            onClick={() => {
                                                handleMailClick();
                                                setIsMobileSidebarOpen(false);
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full",
                                                isMailActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                            )}
                                        >
                                            <Mail className="w-5 h-5" strokeWidth={2} />
                                            Mail Inbox
                                        </button>
                                    </div>
                                </div>

                                {/* Account Section */}
                                <div className="mt-4 pt-4 border-t border-neutral-200">
                                    <div className="px-3 mb-2">
                                        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                            Account
                                        </h3>
                                    </div>
                                    <div className="space-y-1">
                                        {accountNavItems.map((item) => {
                                            const Icon = item.icon;
                                            const active = isActive(item.href);

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setIsMobileSidebarOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                        active
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5" strokeWidth={2} />
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer with Certificate Download and Sign Out - Pinned to bottom */}
                            <div className="shrink-0 border-t border-neutral-200 bg-white">
                                {/* Certificate Download - Component has its own padding and border-top */}
                                <CertificateDownload profile={profile} />
                                
                                {/* Sign Out */}
                                <div
                                    className="px-6 pb-4"
                                    style={{ paddingBottom: `max(env(safe-area-inset-bottom), 16px)` }}
                                >
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                                    >
                                        <LogOut className="w-5 h-5" strokeWidth={2} />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
