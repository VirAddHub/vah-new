import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardViewProvider } from '@/contexts/DashboardViewContext';
import { ActiveBusinessProvider } from '@/contexts/ActiveBusinessContext';
import { OnboardingGate } from '@/components/OnboardingGate';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardViewProvider>
            <ActiveBusinessProvider>
                <OnboardingGate>
                    <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background">
                        <div className="sticky top-0 z-50 shrink-0">
                            <DashboardNavigation />
                        </div>

                        <div className="flex min-h-0 flex-1 overflow-hidden">
                            <DashboardSidebar />

                            <main
                                id="main-content"
                                role="main"
                                className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
                            >
                                <div className="w-full max-w-full px-4 pb-3 pt-2 sm:px-4 sm:pb-5 sm:pt-4 md:px-6 md:pb-6 md:pt-6">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                </OnboardingGate>
            </ActiveBusinessProvider>
        </DashboardViewProvider>
    );
}
