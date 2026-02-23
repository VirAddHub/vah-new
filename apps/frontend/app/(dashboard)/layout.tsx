import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardViewProvider } from '@/contexts/DashboardViewContext';
import { OnboardingGate } from '@/components/OnboardingGate';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardViewProvider>
            <OnboardingGate>
                <div className="min-h-[100dvh] w-full bg-[#F6F6F7]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    <div className="sticky top-0 z-50">
                        <DashboardNavigation />
                    </div>

                    <div className="flex min-h-[calc(100dvh-4rem)]">
                        <DashboardSidebar />
                        
                        <main 
                            id="main-content" 
                            role="main" 
                            className="min-w-0 flex-1 w-full overflow-x-hidden"
                        >
                            <div className="w-full max-w-full pt-4 md:pt-6 pb-3 md:pb-6 px-4 sm:px-6">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </OnboardingGate>
        </DashboardViewProvider>
    );
}
