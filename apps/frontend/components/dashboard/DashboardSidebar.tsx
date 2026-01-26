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
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import { CertificateDownload } from './CertificateDownload';

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
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
    const { activeView, setActiveView } = useDashboardView();
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

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
            setIsOpen(false);
        }
    }, [pathname, isMobile]);

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
        <nav 
            className="w-[220px] flex-shrink-0 bg-white border-r border-[#E5E7EB] h-[calc(100vh-4rem)] fixed left-0 top-16 flex flex-col z-30"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
        >
            <div className="flex-1 overflow-y-auto p-4 pt-6">
                {/* Main Navigation */}
                <div className="mb-6">
                    <div className="flex flex-col gap-2">
                        {/* Mail Inbox - Use state instead of Link */}
                        <button
                            onClick={() => handleMainNavClick('mail')}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-normal leading-[1.4] transition-colors text-left",
                                isMailActive
                                    ? "bg-[#F0FDF4] text-[#024E40] font-medium border-l-2 border-[#206039]"
                                    : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]"
                            )}
                            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                        >
                            <Mail className={cn("w-5 h-5", isMailActive ? "text-[#024E40]" : "text-[#666666]")} />
                            Mail Inbox
                        </button>
                    </div>
                </div>

                {/* Account Section */}
                <div className="mb-6">
                    <div className="px-4 py-2 mb-2">
                        <h3 className="text-[12px] font-medium text-[#666666] uppercase tracking-wide">
                            Account
                        </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {accountNavItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-normal leading-[1.4] transition-colors",
                                        active
                                            ? "bg-[#F0FDF4] text-[#024E40] font-medium border-l-2 border-[#206039]"
                                            : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]"
                                    )}
                                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                >
                                    <Icon className={cn("w-5 h-5", active ? "text-[#024E40]" : "text-[#666666]")} />
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
                {/* Hamburger Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(true)}
                    className="lg:hidden fixed top-20 left-4 z-50 bg-white border border-[#E5E7EB] rounded-lg shadow-sm h-10 w-10"
                >
                    <Menu className="h-5 w-5 text-[#1A1A1A]" />
                </Button>

                {/* Mobile Sidebar Overlay */}
                {isOpen && (
                    <>
                        <div 
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="fixed left-0 top-0 h-full z-50 lg:hidden w-[280px]">
                            <div className="relative h-full bg-white shadow-xl flex flex-col">
                                <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
                                    <h2 className="text-lg font-medium text-[#1A1A1A]">Menu</h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsOpen(false)}
                                        className="h-8 w-8"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    {/* Main Navigation */}
                                    <div className="mb-6">
                                        <div className="flex flex-col gap-2">
                                            {/* Mail Inbox - Use state instead of Link */}
                                            <button
                                                onClick={() => {
                                                    handleMainNavClick('mail');
                                                    setIsOpen(false);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-normal leading-[1.4] transition-colors text-left",
                                                    isMailActive
                                                        ? "bg-[#F0FDF4] text-[#024E40] font-medium border-l-2 border-[#206039]"
                                                        : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]"
                                                )}
                                                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                            >
                                                <Mail className={cn("w-5 h-5", isMailActive ? "text-[#024E40]" : "text-[#666666]")} />
                                                Mail Inbox
                                            </button>
                                        </div>
                                    </div>

                                    {/* Account Section */}
                                    <div className="mb-6">
                                        <div className="px-4 py-2 mb-2">
                                            <h3 className="text-[12px] font-medium text-[#666666] uppercase tracking-wide">
                                                Account
                                            </h3>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {accountNavItems.map((item) => {
                                                const Icon = item.icon;
                                                const active = isActive(item.href);
                                                
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-normal leading-[1.4] transition-colors",
                                                            active
                                                                ? "bg-[#F0FDF4] text-[#024E40] font-medium border-l-2 border-[#206039]"
                                                                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]"
                                                        )}
                                                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                                                    >
                                                        <Icon className={cn("w-5 h-5", active ? "text-[#024E40]" : "text-[#666666]")} />
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Certificate Download - Mobile (Fixed at bottom) */}
                                <div className="border-t border-[#E5E7EB]">
                                    <CertificateDownload />
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
