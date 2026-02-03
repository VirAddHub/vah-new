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
            <div className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col bg-[#F6F6F7]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                <Navigation />
                <div className="flex w-full min-h-[100dvh] overflow-x-hidden flex-1 pt-10 md:pt-16">
                    {/* Sidebar - Inline on desktop, overlay on mobile */}
                    <div className="lg:pl-6">
                    <DashboardSidebar />
                    </div>
                    
                    {/* Main Content - Flows beside sidebar on desktop */}
                    <main 
                        id="main-content" 
                        role="main" 
                        className="min-w-0 flex-1 w-full"
                    >
                        <div className="w-full max-w-full py-3 md:py-6 px-4 sm:px-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </DashboardViewProvider>
    );
}
