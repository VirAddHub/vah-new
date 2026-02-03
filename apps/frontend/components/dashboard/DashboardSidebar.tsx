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
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { CertificateDownload } from './CertificateDownload';

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
    const { activeView, setActiveView, isMobileSidebarOpen, setIsMobileSidebarOpen } = useDashboardView();
    const [isMobile, setIsMobile] = useState(false);
    
    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('vah_jwt');
        localStorage.removeItem('vah_user');
        document.cookie = 'vah_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'vah_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/login';
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setIsOpen(true); // Always open on desktop
            }
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

    // Handle Mail clicks - use state instead of navigation
    const handleMainNavClick = (view: 'mail') => {
        setActiveView(view);
        // Navigate to main dashboard with view param
        router.push('/dashboard?view=' + view);
        if (isMobile) {
            setIsOpen(false);
        }
    };

    // Check if mail is active based on view state
    // Use context activeView for main nav items, pathname for account items
    const isMailActive = activeView === 'mail' || pathname === '/mail';

    const SidebarContent = () => (
        <nav className="hidden lg:flex w-[240px] flex-shrink-0 bg-white border-r border-neutral-200 h-[calc(100vh-4rem)] sticky top-16 flex-col">
            <div className="flex-1 overflow-y-auto p-6">
                {/* Main Navigation */}
                <div className="mb-8">
                    <div className="space-y-1">
                        {/* Mail Inbox */}
                        <button
                            onClick={() => handleMainNavClick('mail')}
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
                <div>
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
            </div>
            
            {/* Certificate Download - Bottom Left */}
            <CertificateDownload />
        </nav>
    );

    // Mobile: Use Sheet/Drawer
    if (isMobile) {
        return (
            <>
                {/* Mobile Sidebar Overlay - Controlled by Navigation component */}
                {isMobileSidebarOpen && (
                    <>
                        <div 
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setIsMobileSidebarOpen(false)}
                        />
                        <div className="fixed left-0 top-0 h-full z-50 lg:hidden w-[280px]">
                            <div className="relative h-full bg-white shadow-xl flex flex-col">
                                <div className="flex items-center justify-between p-6 border-b border-neutral-200">
                                    <h2 className="text-lg font-semibold text-neutral-900">Menu</h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsMobileSidebarOpen(false)}
                                        className="h-8 w-8"
                                    >
                                        <X className="h-5 w-5" strokeWidth={2} />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    {/* Main Navigation */}
                                    <div className="mb-8">
                                        <div className="space-y-1">
                                            {/* Mail Inbox */}
                                            <button
                                                onClick={() => {
                                                    handleMainNavClick('mail');
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
                                    <div>
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
                                
                                {/* Divider */}
                                <div className="border-t border-neutral-200"></div>
                                
                                {/* Sign Out - Final item at bottom */}
                                <div className="p-6">
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsMobileSidebarOpen(false);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                                    >
                                        <LogOut className="w-5 h-5" strokeWidth={2} />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </>
        );
    }

    // Desktop: Always visible sidebar
    return <SidebarContent />;
}
