import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardNavigation } from '@/components/DashboardNavigation';
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
            <div className="min-h-[100dvh] w-full bg-[#F6F6F7]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                {/* Sticky navbar at top - stays in document flow */}
                <div className="sticky top-0 z-50">
                    <DashboardNavigation />
                </div>

                {/* Content area - no padding hack needed with sticky header */}
                <div className="flex min-h-[calc(100dvh-4rem)]">
                    {/* Sidebar - Sticky, flush under navbar */}
                    <DashboardSidebar />
                    
                    {/* Main Content */}
                    <main 
                        id="main-content" 
                        role="main" 
                        className="min-w-0 flex-1 w-full overflow-x-hidden"
                    >
                        {/* Top padding inside main content container (not on wrapper) */}
                        <div className="w-full max-w-full pt-4 md:pt-6 pb-3 md:pb-6 px-4 sm:px-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </DashboardViewProvider>
    );
}
