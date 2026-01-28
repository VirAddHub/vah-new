import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Navigation } from '@/components/Navigation';
import { DashboardViewProvider } from '@/contexts/DashboardViewContext';

// Force dynamic rendering for all dashboard pages (they require authentication)
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardViewProvider>
            <div className="min-h-screen flex flex-col bg-[#F6F6F7]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                <Navigation />
                <div className="flex flex-1 pt-10 md:pt-16">
                    {/* Sidebar - Inline on desktop, overlay on mobile */}
                    <DashboardSidebar />
                    
                    {/* Main Content - Flows beside sidebar on desktop */}
                    <main 
                        id="main-content" 
                        role="main" 
                        className="flex-1 overflow-y-auto w-full lg:w-auto"
                    >
                        <div className="w-full py-3 md:py-6 px-4 md:px-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </DashboardViewProvider>
    );
}
