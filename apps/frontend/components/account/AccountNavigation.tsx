'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CreditCard, MapPin, ShieldCheck, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardBootstrap } from '@/hooks/useDashboardData';
import { isPrimaryVerificationRequiredForNav } from '@/lib/verification-state';

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { label: 'Overview', href: '/account/overview', icon: LayoutDashboard },
    { label: 'Billing', href: '/account/billing', icon: CreditCard },
    { label: 'Addresses', href: '/account/addresses', icon: MapPin },
    { label: 'Verification', href: '/account/verification', icon: ShieldCheck },
    { label: 'Support', href: '/account/support', icon: HelpCircle },
];

export function AccountNavigation() {
    const pathname = usePathname();
    const { data: boot } = useDashboardBootstrap();
    const profile = boot?.ok ? (boot.data.profile as any) : undefined;
    const compliance = boot?.ok ? (boot.data.compliance as any) : undefined;
    const verificationNavRequired = isPrimaryVerificationRequiredForNav({
        verificationState: compliance?.verificationState,
        kycStatus: profile?.kyc_status,
    });

    return (
        <nav className="w-60 flex-shrink-0">
            <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href === '/account/overview' && pathname === '/account');
                        
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-md text-body transition-colors",
                                    isActive
                                        ? "bg-muted text-primary font-medium"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
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
        </nav>
    );
}
