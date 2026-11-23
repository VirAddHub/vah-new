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
    Lock,
    X,
    LogOut,
    Settings,
    Send,
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
import { useAccess, NEXT_STEP_PATH } from '@/hooks/useAccess';
import { navAttention } from '@/components/account/AccessNotice';
import { isOnboardingPath } from '@/components/OnboardingGate';

// Lazy load CertificateDownload to avoid unnecessary bundle size
const CertificateDownload = dynamic(
    () => import('./CertificateDownload').then(mod => ({ default: mod.CertificateDownload })),
    { ssr: false }
);

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
    {
        items: [
            { label: 'Mail inbox', href: '/mail', icon: Mail },
            { label: 'Forwarding', href: '/forwarding', icon: Send },
        ],
    },
    {
        title: 'Account',
        items: [
            { label: 'Overview', href: '/account/overview', icon: LayoutDashboard },
            { label: 'Billing', href: '/account/billing', icon: CreditCard },
            { label: 'Addresses', href: '/account/addresses', icon: MapPin },
            { label: 'Verification', href: '/account/verification', icon: ShieldCheck },
            { label: 'Support', href: '/account/support', icon: HelpCircle },
        ],
    },
    {
        title: 'Settings',
        items: [{ label: 'Settings', href: '/account/settings', icon: Settings }],
    },
];

/**
 * Dashboard sidebar.
 *
 * While an account is still being set up (not paid or not verified), pages that need full service
 * are shown as locked with a short reason, instead of links that silently bounce back to setup.
 * A locked item still responds: it takes the customer to the step they need to finish.
 */
export function DashboardSidebar() {
    const pathname = usePathname() || '';
    const router = useRouter();
    const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboardView();
    const [isMobile, setIsMobile] = useState(false);

    // Single bootstrap bundle — same source as mail dashboard (no competing SWR caches)
    const { data: boot, isLoading: bootLoading, error: bootError } = useDashboardBootstrap();
    const profile = boot?.ok ? (boot.data.profile as any) : undefined;
    const compliance = boot?.ok ? (boot.data.compliance as any) : undefined;
    const verificationNavRequired = isPrimaryVerificationRequiredForNav({
        verificationState: compliance?.verificationState,
        kycStatus: profile?.kyc_status,
    });

    const { access } = useAccess();
    const attention = access ? navAttention(access) : { billing: false, verification: verificationNavRequired };
    const needsAttention = (href: string) =>
        (href === '/account/verification' && attention.verification) || (href === '/account/billing' && attention.billing);

    const restricted = !!access && !access.isAdmin && access.level !== 'full';
    const isLocked = (href: string) => restricted && !isOnboardingPath(href);
    const nextStepPath = access ? NEXT_STEP_PATH[access.next] : '/account';

    const handleLogout = () => performLogout(
        setIsMobileSidebarOpen ? () => setIsMobileSidebarOpen(false) : undefined
    );

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close sidebar when route changes on mobile
    useEffect(() => {
        if (isMobile) setIsMobileSidebarOpen(false);
    }, [pathname, isMobile, setIsMobileSidebarOpen]);

    const isActive = (href: string) => {
        if (href === '/account/overview') {
            return pathname === '/account/overview' || pathname === '/account' || pathname === '/dashboard';
        }
        return pathname === href || pathname.startsWith(href + '/');
    };

    const itemClass = (active: boolean, locked: boolean) => cn(
        'group flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors touch-manipulation',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
            ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
            : locked
                ? 'text-muted-foreground/80 hover:bg-card/70'
                : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
    );

    const navList = (
        <>
            {NAV_SECTIONS.map((section, index) => (
                <div key={section.title ?? 'main'} className={cn(index > 0 && 'mt-6')}>
                    {section.title && (
                        <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {section.title}
                        </h3>
                    )}
                    <div className="space-y-1">
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            const locked = isLocked(item.href);
                            const attentionHere = needsAttention(item.href);

                            if (locked) {
                                return (
                                    <button
                                        key={item.href}
                                        type="button"
                                        onClick={() => {
                                            setIsMobileSidebarOpen(false);
                                            router.push(nextStepPath);
                                        }}
                                        className={itemClass(false, true)}
                                        title="Opens once your account setup is complete"
                                        aria-label={`${item.label}: opens once your account setup is complete. Go to your next step.`}
                                    >
                                        <Icon className="h-[18px] w-[18px] shrink-0 opacity-60" strokeWidth={1.75} aria-hidden />
                                        <span className="flex-1 truncate text-left">{item.label}</span>
                                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                                            <Lock className="h-3.5 w-3.5" aria-hidden /> After setup
                                        </span>
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    aria-current={active ? 'page' : undefined}
                                    className={itemClass(active, false)}
                                >
                                    <Icon
                                        className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-green-ink' : 'opacity-70')}
                                        strokeWidth={active ? 2 : 1.75}
                                        aria-hidden
                                    />
                                    <span className="flex-1 truncate">{item.label}</span>
                                    {attentionHere && (
                                        <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                            Required
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </>
    );

    const certificate = boot?.ok === true ? (
        <CertificateDownload profile={profile} compliance={compliance} />
    ) : bootLoading && !bootError ? (
        <div className="px-4 pb-4 pt-3">
            <div className="h-11 w-full animate-pulse rounded-xl bg-card" aria-hidden />
        </div>
    ) : null;

    // Scroll lock while the mobile drawer is open
    useEffect(() => {
        document.body.style.overflow = isMobileSidebarOpen && isMobile ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMobileSidebarOpen, isMobile]);

    // Escape closes the drawer
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (isMobileSidebarOpen && e.key === 'Escape') setIsMobileSidebarOpen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

    // Focus trap inside the drawer
    useEffect(() => {
        if (!isMobileSidebarOpen) return;
        const handleTrap = (e: KeyboardEvent) => {
            const node = document.getElementById('mobile-sidebar-drawer');
            if (!node || e.key !== 'Tab') return;
            const focusable = node.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', handleTrap);
        return () => window.removeEventListener('keydown', handleTrap);
    }, [isMobileSidebarOpen]);

    // Focus the close button when the drawer opens
    useEffect(() => {
        if (!isMobileSidebarOpen) return;
        const t = setTimeout(() => {
            (document.querySelector('[aria-label="Close menu"]') as HTMLElement | null)?.focus();
        }, 50);
        return () => clearTimeout(t);
    }, [isMobileSidebarOpen]);

    return (
        <>
            <aside className="hidden h-full min-h-0 w-[260px] min-w-[260px] shrink-0 flex-col border-r border-border bg-muted lg:flex">
                <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-5">
                    {navList}
                </nav>
                <div className="shrink-0 border-t border-border">
                    {certificate}
                </div>
            </aside>

            {isMobile && isMobileSidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-primary/40 backdrop-blur-[2px] lg:hidden"
                        onClick={() => setIsMobileSidebarOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        id="mobile-sidebar-drawer"
                        className="fixed left-0 top-0 z-50 h-[100dvh] w-[300px] max-w-[88vw] lg:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
                    >
                        <div className="flex h-[100dvh] flex-col rounded-r-3xl bg-muted shadow-lg">
                            <div className="flex shrink-0 items-center justify-between px-5 py-4">
                                <h2 className="text-lg font-semibold text-foreground">Menu</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    className="h-11 w-11 rounded-full touch-manipulation"
                                    aria-label="Close menu"
                                >
                                    <X className="h-5 w-5" strokeWidth={2} />
                                </Button>
                            </div>

                            <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 pb-4">
                                {navList}
                            </nav>

                            <div className="shrink-0 border-t border-border">
                                {certificate}
                                <div className="px-3 pb-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
                                    <button
                                        onClick={handleLogout}
                                        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                                    >
                                        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
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
