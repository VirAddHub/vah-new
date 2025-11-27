"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { MonitoringDropdown } from "./admin/MonitoringDropdown";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { apiClient, safe } from "../lib/apiClient";
import {
    adminService,
    mailService,
    forwardingService,
    billingService
} from "../lib/services";
import { useAuthedSWR } from "../lib/useAuthedSWR";
import { useAdminHeartbeat } from "../hooks/useAdminHeartbeat";
import { adminApi } from "../lib/services/http";
import { useAdminOverview, useAdminHealth, useAdminActivity, useForwardingStats } from "../lib/hooks/useAdminOverview";
import OverviewMetricCard from "./admin/OverviewMetricCard";
import { StatusBadge } from "./admin/StatusBadge";
import RecentActivityCard from "./admin/RecentActivityCard";
import ForwardingCard from "./admin/ForwardingCard";
import SystemHealthCard from "./admin/SystemHealthCard";
import SystemSummaryCard from "./admin/SystemSummaryCard";
import {
    Mail,
    Users,
    Truck,
    FileText,
    Settings,
    LogOut,
    Shield,
    Activity,
    Check,
    Play,
    RotateCcw,
    Trash2,
    UserX,
    UserCheck,
    AlertTriangle,
    Server,
    Menu,
    X,
    Search,
    Filter,
    Download,
    Plus,
    Eye,
    Edit,
    MoreHorizontal,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    Calendar,
    BarChart3,
    PieChart,
    Users2,
    CreditCard,
    Building2,
    Clipboard,
} from "lucide-react";
import dynamic from 'next/dynamic';

// Dynamic imports for heavy admin components
const UsersSection = dynamic(() => import('./admin/UsersSection'), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const PlansSection = dynamic(() => import('./admin/PlansSection'), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const CollaborativeForwardingBoard = dynamic(() => import('./admin/CollaborativeForwardingBoard'), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const AnalyticsSection = dynamic(() => import('./admin/AnalyticsSection').then(mod => ({ default: mod.AnalyticsSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const SettingsSection = dynamic(() => import('./admin/SettingsSection').then(mod => ({ default: mod.SettingsSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const BlogSection = dynamic(() => import('./admin/BlogSection').then(mod => ({ default: mod.BlogSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const WebVitalsSection = dynamic(() => import('./admin/WebVitalsSection').then(mod => ({ default: mod.WebVitalsSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const BundleAnalysisSection = dynamic(() => import('./admin/BundleAnalysisSection').then(mod => ({ default: mod.BundleAnalysisSection })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const ServiceMonitoring = dynamic(() => import('./admin/ServiceMonitoring').then(mod => ({ default: mod.ServiceMonitoring })), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

const ChVerificationQueue = dynamic(() => import('./admin/ChVerificationQueue'), {
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
});

interface AdminDashboardProps {
    onLogout: () => void;
    onNavigate?: (page: string, data?: any) => void;
    onGoBack?: () => void;
}

type AdminSection = "overview" | "users" | "ch-verification" | "mail" | "forwarding" | "billing" | "plans" | "analytics" | "web-vitals" | "bundle-analysis" | "service-monitoring" | "settings" | "blog";

export function EnhancedAdminDashboard({ onLogout, onNavigate, onGoBack }: AdminDashboardProps) {
    const [activeSection, setActiveSection] = useState<AdminSection>("overview");
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
    const usersKey: readonly [string, any] | null = (activeSection === 'users' || activeSection === 'overview')
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

    // Data loading state for other sections
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'down'>('operational');

    // Throttle repeated requests
    const usersLastLoadedAtRef = useRef<number | null>(null);

    // Overview state for real-time metrics
    type Overview = {
        users: number;
        deletedUsers: number;
        monthlyRevenuePence: number;
        mailProcessed: number;
        activeForwards: number;
    };

    const [overview, setOverview] = useState<Overview>({
        users: 0,
        deletedUsers: 0,
        monthlyRevenuePence: 0,
        mailProcessed: 0,
        activeForwards: 0,
    });
    const [isLoadingOverview, setIsLoadingOverview] = useState(false);

    // Forwarding requests state for overview
    const [forwardingRequests, setForwardingRequests] = useState<any[]>([]);
    const [isLoadingForwarding, setIsLoadingForwarding] = useState(false);
    const [forwardingStats, setForwardingStats] = useState({
        total: 0,
        requested: 0,
        reviewed: 0,
        processing: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0,
    });

    // Recent activity state
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [isLoadingActivity, setIsLoadingActivity] = useState(false);

    // ⛔️ Ensure we never setState after unmount
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // 🔒 Abort previous request before firing a new one
    const abortRef = useRef<AbortController | null>(null);

    // Load recent activity from backend
    const loadRecentActivity = useCallback(async () => {
        if (mountedRef.current) setIsLoadingActivity(true);
        try {
            const token = localStorage.getItem('vah_jwt');
            const response = await fetch('/api/admin/activity', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (mountedRef.current && response.ok) {
                const result = await response.json();
                if (result.ok && result.data && Array.isArray(result.data.activities)) {
                    // Format activities for the UI component
                    const formatted = result.data.activities.slice(0, 10).map((activity: any) => ({
                        id: activity.id,
                        title: activity.title || 'Activity',
                        description: activity.description || 'No description',
                        time: activity.time || 'Unknown time',
                        timestamp: activity.timestamp,
                        type: activity.type
                    }));
                    setRecentActivity(formatted);
                    // Also update metrics for consistency
                    setMetrics((prev: any) => ({
                        ...prev,
                        recent_activity: formatted
                    }));
                }
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        } finally {
            if (mountedRef.current) setIsLoadingActivity(false);
        }
    }, []);

    // Load forwarding stats from dedicated endpoint (more accurate than client-side counting)
    const loadForwardingStats = useCallback(async () => {
        if (mountedRef.current) setIsLoadingForwarding(true);
        try {
            const token = localStorage.getItem('vah_jwt');
            // Load stats for last 90 days to show recent activity (excluding very old requests)
            const response = await fetch('/api/admin/forwarding/stats?days=90', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (mountedRef.current && response.ok) {
                const result = await response.json();
                if (result.ok && result.data) {
                    setForwardingStats({
                        total: result.data.total || 0,
                        requested: result.data.Requested || 0,
                        reviewed: result.data.Reviewed || 0,
                        processing: result.data.Processing || 0,
                        dispatched: result.data.Dispatched || 0,
                        delivered: result.data.Delivered || 0,
                        cancelled: result.data.Cancelled || 0,
                    });
                }
            }

            // Also load recent requests for the "Recent Requests" section
            // Load all statuses to show recent dispatched requests too
            const data = await adminApi.getForwardingRequests({ limit: 10, offset: 0, status: 'all' });
            if (mountedRef.current && data.ok && Array.isArray(data.data)) {
                // Sort by dispatched_at if status is Dispatched, otherwise by created_at
                const sorted = data.data.sort((a: any, b: any) => {
                    const aDate = a.status === 'Dispatched' && a.dispatched_at
                        ? a.dispatched_at
                        : a.created_at;
                    const bDate = b.status === 'Dispatched' && b.dispatched_at
                        ? b.dispatched_at
                        : b.created_at;
                    return bDate - aDate;
                });
                setForwardingRequests(sorted);
            }
        } catch (error) {
            console.error('Error loading forwarding stats:', error);
        } finally {
            if (mountedRef.current) setIsLoadingForwarding(false);
        }
    }, []);

    // Load overview metrics using new service layer
    const loadOverview = useCallback(async () => {
        setIsLoadingOverview(true);
        try {
            const token = localStorage.getItem('vah_jwt');

            // Use the actual backend stats endpoint for accurate counts
            const [usersStatsRes, mailStatsRes, forwardingStatsRes, billingRes] = await Promise.all([
                fetch('/api/admin/users/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                }).then(r => r.ok ? r.json() : { ok: false, data: null }),

                // Get total mail count
                fetch('/api/admin/mail-items?pageSize=1', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                }).then(r => r.ok ? r.json() : { ok: false, data: { total: 0 } }),

                // Get forwarding stats (counts by status)
                fetch('/api/admin/forwarding/stats?days=90', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                }).then(r => r.ok ? r.json() : { ok: false, data: null }),

                // Try to get billing metrics
                fetch('/api/admin/billing/metrics', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                }).then(r => r.ok ? r.json() : { ok: false, data: { monthlyRevenuePence: 0 } }).catch(() => ({ ok: false, data: { monthlyRevenuePence: 0 } }))
            ]);

            // Extract user stats
            const userStats = usersStatsRes.ok && usersStatsRes.data ? usersStatsRes.data : {};

            // Extract mail total
            const mailTotal = mailStatsRes.ok && mailStatsRes.data?.total ? mailStatsRes.data.total : 0;

            // Extract forwarding stats - count active forwards (Requested, Reviewed, Processing)
            const forwardingData = forwardingStatsRes.ok && forwardingStatsRes.data ? forwardingStatsRes.data : {};
            const activeForwards = (forwardingData.Requested || 0) +
                (forwardingData.Reviewed || 0) +
                (forwardingData.Processing || 0);

            // Extract billing revenue
            const revenue = billingRes.ok && billingRes.data?.monthlyRevenuePence
                ? billingRes.data.monthlyRevenuePence
                : 0;

            setOverview({
                users: userStats.total || 0,
                deletedUsers: userStats.deleted || 0,
                monthlyRevenuePence: revenue,
                mailProcessed: mailTotal,
                activeForwards: activeForwards,
            });
        } catch (err) {
            console.error('Error loading overview:', err);
        } finally {
            setIsLoadingOverview(false);
        }
    }, []);

    // Calculate metrics from users data (from SWR)
    useEffect(() => {
        if (users && users.length > 0) {
            const totalUsers = usersTotal; // Use the total from the API response
            const activeUsers = users.filter((u: any) => u.status === 'active').length;
            const pendingKyc = users.filter((u: any) => u.kyc_status === 'pending').length;
            const suspendedUsers = users.filter((u: any) => u.status === 'suspended').length;

            setMetrics({
                totals: {
                    users: totalUsers,
                    active_users: activeUsers,
                    pending_kyc: pendingKyc,
                    suspended_users: suspendedUsers,
                    monthly_revenue_pence: 0,
                    mail_processed: 0,
                    active_forwards: 0
                },
                system_health: {
                    status: 'operational'
                },
                recent_activity: recentActivity // Keep existing activity state
            });

            // Also update the overview state with the correct user count
            setOverview(prev => ({
                ...prev,
                users: totalUsers,
                deletedUsers: users.filter((u: any) => u.deleted_at).length,
            }));
        }
    }, [users, usersTotal]);

    // Load overview data on mount once
    useEffect(() => {
        console.debug('[Admin] Loading overview on mount');
        void loadOverview();
        void loadForwardingStats();
        void loadRecentActivity();
    }, []); // Only run once on mount

    // Poll forwarding stats every 30 seconds when on overview section
    useEffect(() => {
        if (activeSection === 'overview') {
            const interval = setInterval(() => {
                void loadForwardingStats();
            }, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        }
    }, [activeSection, loadForwardingStats]);

    // Check system health using shared heartbeat
    useAdminHeartbeat(async () => {
        try {
            const response = await fetch('/api/healthz');
            if (mountedRef.current) {
                setSystemStatus(response.ok ? 'operational' : 'down');
            }
        } catch (error) {
            if (mountedRef.current) {
                setSystemStatus('down');
            }
        }
    }, 30_000);

    // SWR will automatically fetch users data when the query key changes (filters or page)

    const menuItems = [
        { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
        { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
        { id: "ch-verification", label: "Verification", icon: <Shield className="h-4 w-4" /> },
        { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
        { id: "plans", label: "Plans", icon: <Package className="h-4 w-4" /> },
        { id: "analytics", label: "Analytics", icon: <PieChart className="h-4 w-4" /> },
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
        // Show loading state for overview when data is being loaded initially
        if (activeSection === "overview" && isLoadingOverview && !metrics) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading admin data...</p>
                    </div>
                </div>
            );
        }

        switch (activeSection) {
            case "overview":
                return <OverviewSection
                    onViewForwarding={() => setActiveSection('forwarding')}
                />;
            case "users":
                return (
                    <UsersSection
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
            case "ch-verification":
                return <ChVerificationQueue />;
            case "forwarding":
                return <CollaborativeForwardingBoard onDataUpdate={(requests) => {
                    setForwardingRequests(requests);
                    // Calculate stats
                    const stats = {
                        total: requests.length,
                        requested: requests.filter((r: any) => r.status === 'Requested').length,
                        reviewed: requests.filter((r: any) => r.status === 'Reviewed').length,
                        processing: requests.filter((r: any) => r.status === 'Processing').length,
                        dispatched: requests.filter((r: any) => r.status === 'Dispatched').length,
                        delivered: requests.filter((r: any) => r.status === 'Delivered').length,
                        cancelled: requests.filter((r: any) => r.status === 'Cancelled').length,
                    };
                    setForwardingStats(stats);
                }} />;
            case "plans":
                return <PlansSection />;
            case "analytics":
                return <AnalyticsSection />;
            case "web-vitals":
                return <WebVitalsSection />;
            case "service-monitoring":
                return <ServiceMonitoring />;
            case "bundle-analysis":
                return <BundleAnalysisSection />;
            case "settings":
                return <SettingsSection />;
            case "blog":
                return <BlogSection />;
            default:
                return <OverviewSection
                    onViewForwarding={() => setActiveSection('forwarding')}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation Header */}
            <header className="bg-card border-b border-border">
                <div className="flex items-center justify-between h-14 px-4">
                    {/* Logo and Branding */}
                    <button
                        onClick={() => onNavigate?.('home')}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <span className="text-lg font-semibold text-foreground">VirtualAddress<span className="text-primary">Hub</span></span>
                    </button>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {menuItems.map((item) => (
                            <Button
                                key={item.id}
                                variant={activeSection === item.id ? "primary" : "ghost"}
                                size="sm"
                                onClick={() => setActiveSection(item.id as AdminSection)}
                                className="gap-1.5 h-8 px-3"
                            >
                                {item.icon}
                                <span className="text-sm">{item.label}</span>
                            </Button>
                        ))}
                        <Button asChild variant="ghost" size="sm" className="gap-1.5 h-8 px-3">
                            <Link href="/admin/filename-generator" className="flex items-center gap-1.5">
                                <Clipboard className="h-4 w-4" />
                                <span className="text-sm">Filename Generator</span>
                            </Link>
                        </Button>
                        <MonitoringDropdown
                            activeSection={activeSection}
                            onSectionChange={(section) => setActiveSection(section as AdminSection)}
                        />
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1">
                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden h-8 w-8 p-0"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </Button>

                        {/* Quick Actions - Desktop Only */}
                        <div className="hidden lg:flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Logout Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onLogout}
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Sign out</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden border-t border-border p-3">
                        <div className="grid grid-cols-2 gap-2">
                            {menuItems.map((item) => (
                                <Button
                                    key={item.id}
                                    variant={activeSection === item.id ? "primary" : "ghost"}
                                    size="sm"
                                    onClick={() => {
                                        setActiveSection(item.id as AdminSection);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="justify-start gap-2 h-8 text-xs"
                                >
                                    {item.icon}
                                    <span className="truncate">{item.label}</span>
                                </Button>
                            ))}
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="justify-start gap-2 h-8 text-xs col-span-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Link href="/admin/filename-generator" className="flex items-center gap-2">
                                    <Clipboard className="h-4 w-4" />
                                    <span className="truncate">Filename Generator</span>
                                </Link>
                            </Button>
                            <div className="col-span-2">
                                <MonitoringDropdown
                                    activeSection={activeSection}
                                    onSectionChange={(section) => {
                                        setActiveSection(section as AdminSection);
                                        setMobileMenuOpen(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="p-4 lg:p-6">
                {renderContent()}
            </main>

        </div>
    );
}

// Enhanced Section Components
function OverviewSection({ onViewForwarding }: { onViewForwarding: () => void }) {
    // Use new hooks for data fetching
    const { data: overview, isLoading: ovLoading } = useAdminOverview();
    const { data: health } = useAdminHealth();
    const { data: activity } = useAdminActivity(10);
    const { data: forwarding } = useForwardingStats(90);

    const m = overview?.metrics;
    const links = overview?.links;
    const severity = health?.severity || 'down';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Admin Overview</h1>
                    <p className="text-sm text-muted-foreground">System status and key metrics</p>
                </div>
                <StatusBadge severity={severity} />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <OverviewMetricCard
                    title="Users"
                    value={m?.totals?.users?.toLocaleString() ?? '—'}
                    href={links?.users}
                    loading={ovLoading}
                />
                <OverviewMetricCard
                    title="Active (30d)"
                    value={m?.totals?.active_users?.toLocaleString() ?? '—'}
                    href={links?.active_users}
                    loading={ovLoading}
                />
                <OverviewMetricCard
                    title="KYC Pending"
                    value={m?.totals?.pending_kyc?.toLocaleString() ?? '—'}
                    href={links?.pending_kyc}
                    loading={ovLoading}
                />
                <OverviewMetricCard
                    title="Revenue (This Month)"
                    value={`£${((m?.revenue?.this_month_pence || 0) / 100).toFixed(2)}`}
                    href={links?.revenue}
                    sub={m?.revenue?.delta_pct == null ? '—' : `${m.revenue.delta_pct.toFixed(1)}% vs last month`}
                    loading={ovLoading}
                />
                <OverviewMetricCard
                    title="Mail (30d)"
                    value={m?.mail?.last30d?.toLocaleString() ?? '—'}
                    href={links?.mail}
                    loading={ovLoading}
                />
                <OverviewMetricCard
                    title="Active Forwards"
                    value={m?.forwards?.active?.toLocaleString() ?? '—'}
                    href={links?.forwards}
                    loading={ovLoading}
                />
            </div>

            {/* Forwarding card */}
            <ForwardingCard data={forwarding} loading={!forwarding && !ovLoading} />

            {/* Dashboard grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RecentActivityCard data={activity} loading={!activity && !ovLoading} />
                <div className="space-y-4">
                    <SystemHealthCard />
                    <SystemSummaryCard data={overview} loading={ovLoading} />
                </div>
            </div>
        </div>
    );
}


// Helper Components
function MetricCard({ title, value, change, trend, icon }: {
    title: string;
    value: string;
    change: string;
    trend: "up" | "down";
    icon: React.ReactNode;
}) {
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">{title}</p>
                        <p className="text-lg font-bold">{value}</p>
                        <p className={`text-xs flex items-center gap-1 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                            {trend === "up" ? <ArrowUp className="h-2 w-2" /> : <ArrowDown className="h-2 w-2" />}
                            {change}
                        </p>
                    </div>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function ActivityItem({ icon, title, description, time }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    time: string;
}) {
    return (
        <div className="flex items-start gap-2">
            <div className="p-1 bg-muted rounded">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-xs font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
                <p className="text-xs text-muted-foreground">{time}</p>
            </div>
        </div>
    );
}

function StatusItem({ label, status, uptime }: {
    label: string;
    status: "operational" | "warning" | "error";
    uptime: string;
}) {
    const statusColors = {
        operational: "text-green-500",
        warning: "text-yellow-500",
        error: "text-red-500"
    };

    const statusIcons = {
        operational: <CheckCircle className="h-3 w-3" />,
        warning: <AlertCircle className="h-3 w-3" />,
        error: <XCircle className="h-3 w-3" />
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={statusColors[status]}>
                    {statusIcons[status]}
                </div>
                <span className="text-xs">{label}</span>
            </div>
            <div className="text-right">
                <div className="text-xs text-muted-foreground">Uptime</div>
                <div className="text-xs font-medium">{uptime}</div>
            </div>
        </div>
    );
}

