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
            <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#F6F6F7]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                {/* Fixed navbar at top */}
                <div className="fixed top-0 inset-x-0 z-50 h-16 bg-white border-b border-neutral-200">
                    <Navigation />
                </div>

                {/* Content area with top offset for fixed navbar */}
                <div className="flex pt-16">
                    {/* Sidebar - Sticky, flush under navbar */}
                    <DashboardSidebar />
                    
                    {/* Main Content */}
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
