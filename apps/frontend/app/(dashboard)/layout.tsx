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
                    className="flex-1 overflow-y-auto lg:ml-[220px]"
                >
                    <div className="w-full py-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
