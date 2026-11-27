"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { WhoamiUser } from "@/lib/verifiedAdminSession";
// Monitoring hooks removed - using Sentry instead
// import { useAdminOverview, useAdminHealth, useAdminActivity, useForwardingStats } from "@/lib/hooks/useAdminOverview";
// import RecentActivityCard from "@/components/admin/RecentActivityCard";
// import ForwardingCard from "@/components/admin/ForwardingCard";
// import SystemHealthCard from "@/components/admin/SystemHealthCard";
// import SystemSummaryCard from "@/components/admin/SystemSummaryCard";
import { AdminHeader } from "@/components/admin/parts/AdminHeader";
// AdminStats removed - using Sentry instead

import {
    Users,
    Truck,
    FileText,
    Package,
    Mail,
    ClipboardList,
    ShieldCheck,
} from "lucide-react";
import dynamic from 'next/dynamic';

const UsersSection = dynamic(() => import('@/components/admin/UsersSection'), { loading: () => <div className="p-6 text-graphite">Loading…</div> });
const ChVerificationQueue = dynamic(() => import('@/components/admin/ChVerificationQueue'), { ssr: false });
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

// SettingsSection removed - not used

const BlogSection = dynamic(() => import('@/components/admin/BlogSection').then(mod => ({ default: mod.BlogSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const MailSection = dynamic(() => import('@/components/admin/MailSection').then(mod => ({ default: mod.MailSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const CompanyChecksSection = dynamic(() => import('@/components/admin/CompanyChecksSection'), {
    loading: () => <div className="p-6 text-graphite">Loading…</div>,
});
const AuditLogSection = dynamic(() => import('@/components/admin/AuditLogSection').then(mod => ({ default: mod.AuditLogSection })), {
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
    /** Parent must pass the user from useVerifiedAdminSession (BFF whoami). */
    verifiedAdminUser: WhoamiUser | null;
}

type AdminSection = "users" | "mail" | "forwarding" | "companies-house" | "company-checks" | "plans" | "blog" | "audit";

export function EnhancedAdminDashboard({
    onLogout,
    onNavigate,
    onGoBack,
    verifiedAdminUser,
}: AdminDashboardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeSection, setActiveSection] = useState<AdminSection>("users");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Sync activeSection with URL query param
    useEffect(() => {
        const sectionParam = searchParams.get('section');
        setActiveSection(sectionParam && ['users', 'mail', 'forwarding', 'companies-house', 'company-checks', 'plans', 'blog', 'audit'].includes(sectionParam) ? sectionParam as AdminSection : 'users');
    }, [searchParams]);

    // Update URL when activeSection changes
    const handleSectionChange = useCallback((section: AdminSection) => {
        setActiveSection(section);
        router.push(`/admin/dashboard?section=${section}`, { scroll: false });
    }, [router]);

    const menuItems = [
        { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
        { id: "mail", label: "Mail", icon: <Mail className="h-4 w-4" /> },
        { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
        { id: "companies-house", label: "Companies House", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "plans", label: "Plans", icon: <Package className="h-4 w-4" /> },
        { id: "blog", label: "Blog", icon: <FileText className="h-4 w-4" /> },
        { id: "audit", label: "Audit log", icon: <ClipboardList className="h-4 w-4" /> },
    ] as const;

    const renderContent = () => {
        switch (activeSection) {
            case "users":
                return (
                    <UsersSection />
                );
            case "mail":
                return <MailSection />;
            case "forwarding":
                return (
                    <CollaborativeForwardingBoard verifiedAdminUser={verifiedAdminUser} />
                );
            case "companies-house":
                return <ChVerificationQueue />;
            case "company-checks":
                return <CompanyChecksSection />;
            case "plans":
                return <PlansSection />;
            case "blog":
                return <BlogSection />;
            case "audit":
                return <AuditLogSection />;
            default:
                // Exhaustiveness check: TypeScript will error if a case is missing
                const _exhaustive: never = activeSection;
                // Fallback to users if somehow an invalid section is set
                return (
                    <UsersSection />
                );
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                onNavigate={onNavigate}
                menuItems={menuItems}
                activeSection={activeSection}
                onSelectSection={(section) => handleSectionChange(section as AdminSection)}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                onLogout={onLogout}
                onGoInvoices={() => router.push('/admin/invoices')}
                onGoFilenameGenerator={() => router.push('/admin/filename-generator')}
            />

            {/* Main Content */}
            <main id="main-content" className="p-4 lg:ml-56 lg:p-8">
                {renderContent()}
            </main>

        </div>
    );
}

// Overview and monitoring components removed - using Sentry instead

