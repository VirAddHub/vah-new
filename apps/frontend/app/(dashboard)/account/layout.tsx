'use client';

import { AccountNavigation } from '@/components/account/AccountNavigation';
import { Navigation } from '@/components/Navigation';

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            <Navigation onNavigate={() => {}} />
            <main id="main-content" role="main" className="flex-1">
                <div className="max-w-[1440px] mx-auto px-[80px] py-[80px]">
                    <div className="flex gap-[55px] items-start">
                        <AccountNavigation />
                        <div className="flex-1">
                            {children}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
