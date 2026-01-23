'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CreditCard, MapPin, ShieldCheck, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const router = useRouter();

    return (
        <nav className="w-[240px] flex-shrink-0" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4">
                <div className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href === '/account/overview' && pathname === '/account');
                        
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-[8px] text-[16px] font-normal leading-[1.4] transition-colors",
                                    isActive
                                        ? "bg-[#F9F9F9] text-[#024E40] font-medium"
                                        : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]"
                                )}
                                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-[#024E40]" : "text-[#666666]")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
