'use client';

import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Navigation } from '@/components/Navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            <Navigation onNavigate={() => {}} />
            <div className="flex flex-1 pt-16">
                {/* Sidebar - Fixed on desktop, overlay on mobile */}
                <DashboardSidebar />
                
                {/* Main Content - Add left margin on desktop to account for sidebar */}
                <main 
                    id="main-content" 
                    role="main" 
                    className="flex-1 overflow-y-auto lg:ml-[240px]"
                >
                    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-20 py-8 lg:py-20">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
