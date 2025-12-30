"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthedSWR } from "@/lib/useAuthedSWR";
// Monitoring hooks removed - using Sentry instead
// import { useAdminOverview, useAdminHealth, useAdminActivity, useForwardingStats } from "@/lib/hooks/useAdminOverview";
// import RecentActivityCard from "@/components/admin/RecentActivityCard";
// import ForwardingCard from "@/components/admin/ForwardingCard";
// import SystemHealthCard from "@/components/admin/SystemHealthCard";
// import SystemSummaryCard from "@/components/admin/SystemSummaryCard";
import { AdminHeader } from "@/components/admin/parts/AdminHeader";
// AdminStats removed - using Sentry instead
import { AdminUsersTable } from "@/components/admin/parts/AdminUsersTable";
import {
    Users,
    Truck,
    FileText,
    Settings,
    Package,
    Mail,
} from "lucide-react";
import dynamic from 'next/dynamic';

const PlansSection = dynamic(() => import('@/components/admin/PlansSection'), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const CollaborativeForwardingBoard = dynamic(() => import('@/components/admin/CollaborativeForwardingBoard'), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

// AnalyticsSection removed - no backend endpoint exists
// const AnalyticsSection = dynamic(() => import('@/components/admin/AnalyticsSection').then(mod => ({ default: mod.AnalyticsSection })), {
//     loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
// });

const SettingsSection = dynamic(() => import('@/components/admin/SettingsSection').then(mod => ({ default: mod.SettingsSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const BlogSection = dynamic(() => import('@/components/admin/BlogSection').then(mod => ({ default: mod.BlogSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const MailSection = dynamic(() => import('@/components/admin/MailSection').then(mod => ({ default: mod.MailSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

// Monitoring sections removed - using Sentry instead
// const WebVitalsSection = dynamic(() => import('@/components/admin/WebVitalsSection').then(mod => ({ default: mod.WebVitalsSection })), {
//     loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
// });

// const BundleAnalysisSection = dynamic(() => import('@/components/admin/BundleAnalysisSection').then(mod => ({ default: mod.BundleAnalysisSection })), {
//     loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
// });

// const ServiceMonitoring = dynamic(() => import('@/components/admin/ServiceMonitoring').then(mod => ({ default: mod.ServiceMonitoring })), {
//     loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
// });


interface AdminDashboardProps {
    onLogout: () => void;
    onNavigate?: (page: string, data?: any) => void;
    onGoBack?: () => void;
}

type AdminSection = "users" | "mail" | "forwarding" | "billing" | "plans" | "settings" | "blog";

export function EnhancedAdminDashboard({ onLogout, onNavigate, onGoBack }: AdminDashboardProps) {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<AdminSection>("users");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Pagination state
    const [usersPage, setUsersPage] = useState(1);

    // User filters state
    const [userFilters, setUserFilters] = useState({
        search: '',
        status: '',
        plan_id: '',
        kyc_status: '',
    });

    // Build query params for users - include ALL filters in key for immediate fetch
    const usersQueryParams = {
        page: usersPage,
        pageSize: 50,
        ...(userFilters.search && { search: userFilters.search }),
        ...(userFilters.status && { status: userFilters.status }),
        ...(userFilters.plan_id && { plan_id: userFilters.plan_id }),
        ...(userFilters.kyc_status && { kyc_status: userFilters.kyc_status }),
    };

    // Use authenticated SWR with proper key that triggers immediate fetch on any change
    // Note: The search input in UsersSection will handle debouncing before calling onFiltersChange
    const usersKey: readonly [string, any] | null = activeSection === 'users'
        ? ['/api/admin/users', usersQueryParams] as const
        : null;

    const {
        data: usersData,
        isLoading: usersLoading,
        isValidating: usersValidating,
        error: usersError,
        mutate: refetchUsers
    } = useAuthedSWR<{ items: any[]; total: number; page: number; pageSize: number }>(usersKey, {
        keepPreviousData: true,
        refreshInterval: 300000, // 5 minutes instead of 1 minute
        refreshWhenHidden: false,
        refreshWhenOffline: false,
        revalidateOnFocus: false, // Disable focus revalidation
        revalidateOnReconnect: false, // Disable reconnect revalidation
        dedupingInterval: 10000, // Dedupe requests within 10 seconds
        errorRetryCount: 1, // Reduce retry count
        errorRetryInterval: 15000, // Increase retry interval
    });

    const users = usersData?.items ?? [];
    const usersTotal = usersData?.total ?? 0;

    // Overview and monitoring loading functions removed - using Sentry instead

    // Overview loading removed - using Sentry instead

    // Overview polling removed - using Sentry instead

    // System health monitoring removed - using Sentry instead

    // SWR will automatically fetch users data when the query key changes (filters or page)

    const menuItems = [
        { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
        { id: "mail", label: "Mail", icon: <Mail className="h-4 w-4" /> },
        { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
        { id: "plans", label: "Plans", icon: <Package className="h-4 w-4" /> },
        { id: "blog", label: "Blog", icon: <FileText className="h-4 w-4" /> },
        { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ] as const;

    const handleFiltersChange = useCallback((filters: {
        search: string;
        status: string;
        plan_id: string;
        kyc_status: string;
    }) => {
        console.debug('[Users] Filters changed:', filters);
        setUserFilters(filters);
    }, []);

    const renderContent = () => {
        switch (activeSection) {
            case "users":
                return (
                    <AdminUsersTable
                        users={users}
                        loading={usersLoading}
                        error={usersError?.message || null}
                        onFiltersChange={handleFiltersChange}
                        total={usersTotal}
                        page={usersPage}
                        pageSize={50}
                        onPageChange={setUsersPage}
                        isValidating={usersValidating}
                        onRefreshUsers={refetchUsers}
                    />
                );
            case "mail":
                return <MailSection />;
            case "forwarding":
                return <CollaborativeForwardingBoard />;
            case "plans":
                return <PlansSection />;
            case "settings":
                return <SettingsSection />;
            case "blog":
                return <BlogSection />;
            default:
                // Default to users if no section matches
                return (
                    <AdminUsersTable
                        users={users}
                        loading={usersLoading}
                        error={usersError?.message || null}
                        onFiltersChange={handleFiltersChange}
                        total={usersTotal}
                        page={usersPage}
                        pageSize={50}
                        onPageChange={setUsersPage}
                        isValidating={usersValidating}
                        onRefreshUsers={refetchUsers}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                onNavigate={onNavigate}
                menuItems={menuItems}
                activeSection={activeSection}
                onSelectSection={(section) => setActiveSection(section as AdminSection)}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                onLogout={onLogout}
                onGoInvoices={() => router.push('/admin/invoices')}
                onGoFilenameGenerator={() => router.push('/admin/filename-generator')}
            />

            {/* Main Content */}
            <main className="p-4 lg:p-6">
                {renderContent()}
            </main>

        </div>
    );
}

// Overview and monitoring components removed - using Sentry instead

