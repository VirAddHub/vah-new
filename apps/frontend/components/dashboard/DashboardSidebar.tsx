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
    Settings,
    type LucideIcon
} from 'lucide-react';
import { performLogout } from "@/lib/logout";
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { useDashboardBootstrap } from '@/hooks/useDashboardData';
import { isPrimaryVerificationRequiredForNav } from '@/lib/verification-state';
import { useToast } from '@/components/ui/use-toast';

// Lazy load CertificateDownload to avoid unnecessary bundle size
// Only load when sidebar is rendered (not on every page)
const CertificateDownload = dynamic(
    () => import('./CertificateDownload').then(mod => ({ default: mod.CertificateDownload })),
    { ssr: false }
);

/**
 * Premium Dashboard Sidebar
 * 
 * Design principles:
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

const settingsNavItems: NavItem[] = [
    { label: 'Settings', href: '/account/settings', icon: Settings },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboardView();
    const { toast } = useToast();
    const [isMobile, setIsMobile] = useState(false);
    
    // Single bootstrap bundle — same source as mail dashboard (no competing SWR caches)
    const { data: boot, isLoading: bootLoading, error: bootError } = useDashboardBootstrap();
    const profile = boot?.ok ? (boot.data.profile as any) : undefined;
    const compliance = boot?.ok ? (boot.data.compliance as any) : undefined;
    const verificationNavRequired = isPrimaryVerificationRequiredForNav({
        verificationState: compliance?.verificationState,
        kycStatus: profile?.kyc_status,
    });

    const handleLogout = () => performLogout(
        setIsMobileSidebarOpen ? () => setIsMobileSidebarOpen(false) : undefined
    );

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
        <aside className="hidden h-full min-h-0 w-[240px] shrink-0 flex-col border-r border-border bg-card lg:flex">
            <div className="flex h-full min-h-0 w-full flex-col">
                {/* Nav area - scrollable if needed */}
                <nav className="flex-1 overflow-y-auto px-4 py-4">
                {/* Main Navigation */}
                <div className="mb-4">
                    <div className="space-y-1">
                        {/* Mail Inbox */}
                        <button
                                onClick={handleMailClick}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors text-left w-full",
                                isMailActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <Mail className="w-5 h-5" strokeWidth={2} />
                            Mail Inbox
                        </button>
                    </div>
                </div>

                                    {/* Account Section */}
                                <div className="mt-4 pt-4 border-t border-border">
                                        <div className="px-3 mb-2">
                                            <h3 className="text-caption font-medium text-muted-foreground uppercase tracking-wider">
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
                                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors",
                                                            active
                                                                ? "bg-primary/10 text-primary"
                                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                        )}
                                                    >
                                                        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                                                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                                            <span className="truncate">{item.label}</span>
                                                            {item.href === '/account/verification' && verificationNavRequired && (
                                                                <span className="shrink-0 text-caption font-semibold text-destructive">
                                                                    Required
                                                                </span>
                                                            )}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Settings Section */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <div className="px-3 mb-2">
                                            <h3 className="text-caption font-medium text-muted-foreground uppercase tracking-wider">
                                                Settings
                                            </h3>
                                        </div>
                                        <div className="space-y-1">
                                            {settingsNavItems.map((item) => {
                                                const Icon = item.icon;
                                                const active = isActive(item.href);

                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsMobileSidebarOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors",
                                                            active
                                                                ? "bg-primary/10 text-primary"
                                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
                <div className="shrink-0 bg-card">
                    {boot?.ok === true ? (
                        <CertificateDownload profile={profile} compliance={compliance} />
                    ) : bootLoading && !bootError ? (
                        <div className="border-t border-border px-3 pb-4 pt-3 sm:px-4 sm:pb-6 sm:pt-4">
                            <div
                                className="h-11 w-full animate-pulse rounded-lg bg-muted/50"
                                aria-hidden
                            />
                        </div>
                    ) : null}
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
                        <div className="flex h-[100dvh] flex-col bg-card shadow-xl">
                            {/* Header - Fixed at top, touch-friendly */}
                            <div className="shrink-0 flex items-center justify-between px-4 py-4 sm:p-5 border-b border-border">
                                    <h2 className="text-body-lg font-semibold text-foreground">Menu</h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsMobileSidebarOpen(false)}
                                        className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation"
                                        aria-label="Close menu"
                                    >
                                        <X className="h-5 w-5" strokeWidth={2} />
                                    </Button>
                                </div>

                            {/* Nav area - Scrollable, 44px touch targets */}
                            <div className="flex-1 overflow-y-auto px-3 py-4">
                                    <div className="mb-2">
                                        <div className="space-y-0.5">
                                            <button
                                                onClick={() => {
                                                    handleMailClick();
                                                    setIsMobileSidebarOpen(false);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-body-sm font-medium transition-colors text-left w-full touch-manipulation",
                                                    isMailActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                )}
                                            >
                                                <Mail className="w-5 h-5 shrink-0" strokeWidth={2} />
                                                Mail Inbox
                                            </button>
                                        </div>
                                    </div>

                                    {/* Account Section */}
                                    <div className="mt-2 pt-4 border-t border-border">
                                        <div className="px-3 mb-2">
                                            <h3 className="text-caption font-medium text-muted-foreground uppercase tracking-wider">
                                                Account
                                            </h3>
                                        </div>
                                        <div className="space-y-0.5">
                                            {accountNavItems.map((item) => {
                                                const Icon = item.icon;
                                                const active = isActive(item.href);
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsMobileSidebarOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-body-sm font-medium transition-colors touch-manipulation",
                                                            active
                                                                ? "bg-primary/10 text-primary"
                                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                        )}
                                                    >
                                                        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                                                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                                            <span className="truncate">{item.label}</span>
                                                            {item.href === '/account/verification' && verificationNavRequired && (
                                                                <span className="shrink-0 text-caption font-semibold text-destructive">
                                                                    Required
                                                                </span>
                                                            )}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Settings Section */}
                                    <div className="mt-2 pt-4 border-t border-border">
                                        <div className="px-3 mb-2">
                                            <h3 className="text-caption font-medium text-muted-foreground uppercase tracking-wider">
                                                Settings
                                            </h3>
                                        </div>
                                        <div className="space-y-0.5">
                                            {settingsNavItems.map((item) => {
                                                const Icon = item.icon;
                                                const active = isActive(item.href);
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsMobileSidebarOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-body-sm font-medium transition-colors touch-manipulation",
                                                            active
                                                                ? "bg-primary/10 text-primary"
                                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                        )}
                                                    >
                                                        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                            {/* Footer with Certificate Download and Sign Out - Pinned to bottom */}
                            <div className="shrink-0 border-t border-border bg-card">
                                {boot?.ok === true ? (
                                    <CertificateDownload profile={profile} compliance={compliance} />
                                ) : bootLoading && !bootError ? (
                                    <div className="border-t border-border px-3 pb-4 pt-3 sm:px-4 sm:pb-6 sm:pt-4">
                                        <div
                                            className="h-11 w-full animate-pulse rounded-lg bg-muted/50"
                                            aria-hidden
                                        />
                                    </div>
                                ) : null}
                                
                                {/* Sign Out */}
                                <div
                                    className="px-6 pb-4"
                                    style={{ paddingBottom: `max(env(safe-area-inset-bottom), 16px)` }}
                                >
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors text-left w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
