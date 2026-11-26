import { CustomerWorkspaceBar } from '@/components/dashboard/CustomerWorkspaceBar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { DashboardViewProvider } from '@/contexts/DashboardViewContext';
import { ActiveBusinessProvider } from '@/contexts/ActiveBusinessContext';
import { OnboardingGate, RestrictedContent } from '@/components/OnboardingGate';
import { AccessNoticeSlot } from '@/components/account/AccessNotice';
import { MobileTabBar } from '@/components/dashboard/MobileTabBar';

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
                    <div className="customer-dashboard-shell flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background">
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
                                <div className="customer-workspace-content w-full">
                                    <CustomerWorkspaceBar />
                                    <AccessNoticeSlot />
                                    <RestrictedContent>{children}</RestrictedContent>
                                </div>
                            </main>
                        </div>
                        <MobileTabBar />
                    </div>
                </OnboardingGate>
            </ActiveBusinessProvider>
        </DashboardViewProvider>
    );
}
