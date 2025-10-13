"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { VAHLogo } from "./VAHLogo";
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

interface AdminDashboardProps {
    onLogout: () => void;
    onNavigate?: (page: string, data?: any) => void;
    onGoBack?: () => void;
}

type AdminSection = "overview" | "users" | "mail" | "forwarding" | "billing" | "plans" | "analytics" | "web-vitals" | "bundle-analysis" | "service-monitoring" | "settings" | "blog";

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

    // Load forwarding requests for overview using centralized HTTP service
    const loadForwardingRequests = useCallback(async () => {
        if (mountedRef.current) setIsLoadingForwarding(true);
        try {
            const data = await adminApi.getForwardingRequests({ limit: 50, offset: 0 });
            if (mountedRef.current && data.ok && Array.isArray(data.data)) {
                const requests = data.data;
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
            }
        } catch (error) {
            console.error('Error loading forwarding requests:', error);
        } finally {
            if (mountedRef.current) setIsLoadingForwarding(false);
        }
    }, []);

    // Load overview metrics using new service layer
    const loadOverview = useCallback(async () => {
        setIsLoadingOverview(true);
        try {
            const [usersRes, mailRes, forwardsRes, billingRes] = await Promise.all([
                adminService.getUsers(),
                adminService.getMailItems(),
                adminService.getForwardingRequests(),
                adminService.getAuditLogs({ limit: 1, offset: 0 })
            ]);

            setOverview({
                users: usersRes.ok ? Array.isArray(usersRes.data) ? usersRes.data.length : 0 : 0,
                deletedUsers: usersRes.ok ? Array.isArray(usersRes.data) ? usersRes.data.filter((u: any) => u.deleted_at).length : 0 : 0,
                monthlyRevenuePence: 0, // TODO: implement billing metrics endpoint
                mailProcessed: mailRes.ok ? Array.isArray(mailRes.data) ? mailRes.data.length : 0 : 0,
                activeForwards: forwardsRes.ok ? Array.isArray(forwardsRes.data) ? forwardsRes.data.filter((f: any) => f.status === 'pending').length : 0 : 0,
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
                recent_activity: []
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
        void loadForwardingRequests();
    }, []); // Only run once on mount

    // Forwarding requests polling is now handled by CollaborativeForwardingBoard component

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
                    metrics={metrics}
                    overview={overview}
                    systemStatus={systemStatus}
                    forwardingRequests={forwardingRequests}
                    forwardingStats={forwardingStats}
                    isLoadingForwarding={isLoadingForwarding}
                    onViewForwarding={() => setActiveSection('forwarding')}
                />;
            case "users":
                return <UsersSection
                    users={users}
                    loading={usersLoading}
                    error={usersError?.message || null}
                    onFiltersChange={handleFiltersChange}
                    total={usersTotal}
                    page={usersPage}
                    pageSize={50}
                    onPageChange={setUsersPage}
                    isValidating={usersValidating}
                />;
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
                    metrics={metrics}
                    overview={overview}
                    systemStatus={systemStatus}
                    forwardingRequests={forwardingRequests}
                    forwardingStats={forwardingStats}
                    isLoadingForwarding={isLoadingForwarding}
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
                        <VAHLogo onNavigate={onNavigate} size="lg" showText={true} />
                    </button>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {menuItems.map((item) => (
                            <Button
                                key={item.id}
                                variant={activeSection === item.id ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setActiveSection(item.id as AdminSection)}
                                className="gap-1.5 h-8 px-3"
                            >
                                {item.icon}
                                <span className="text-sm">{item.label}</span>
                            </Button>
                        ))}
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
                                    variant={activeSection === item.id ? "default" : "outline"}
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
                {/* Deleted Users Banner */}
                {overview?.deletedUsers > 0 && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <div>
                                    <h3 className="font-medium text-orange-800">Deleted Users</h3>
                                    <p className="text-sm text-orange-600">
                                        {overview.deletedUsers} user{overview.deletedUsers !== 1 ? 's' : ''} have been deleted
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveSection('users')}
                                className="text-orange-700 border-orange-300 hover:bg-orange-100"
                            >
                                View Users
                            </Button>
                        </div>
                    </div>
                )}

                {renderContent()}
            </main>

        </div>
    );
}

// Enhanced Section Components
function OverviewSection({
    metrics,
    overview,
    systemStatus,
    forwardingRequests,
    forwardingStats,
    isLoadingForwarding,
    onViewForwarding
}: {
    metrics: any;
    overview: any;
    systemStatus: 'operational' | 'degraded' | 'down';
    forwardingRequests: any[];
    forwardingStats: any;
    isLoadingForwarding: boolean;
    onViewForwarding: () => void;
}) {
    const totals = safe(metrics?.totals, {});
    const systemHealth = safe(metrics?.system_health, {});
    const recentActivity = safe(metrics?.recent_activity, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Admin Overview</h1>
                    <p className="text-sm text-muted-foreground">System status and key metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`gap-1 text-xs ${systemStatus === 'operational' ? 'border-green-500' :
                        systemStatus === 'degraded' ? 'border-yellow-500' :
                            'border-red-500'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${systemStatus === 'operational' ? 'bg-green-500' :
                            systemStatus === 'degraded' ? 'bg-yellow-500' :
                                'bg-red-500'
                            }`} />
                        {systemStatus === 'operational' ? 'Operational' :
                            systemStatus === 'degraded' ? 'Degraded' :
                                'Down'}
                    </Badge>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <MetricCard
                    title="Users"
                    value={metrics?.totals?.users?.toLocaleString() || '0'}
                    change=""
                    trend="up"
                    icon={<Users2 className="h-4 w-4 text-blue-500" />}
                />
                <MetricCard
                    title="Active"
                    value={metrics?.totals?.active_users?.toLocaleString() || '0'}
                    change=""
                    trend="up"
                    icon={<Users2 className="h-4 w-4 text-green-500" />}
                />
                <MetricCard
                    title="KYC Pending"
                    value={metrics?.totals?.pending_kyc?.toLocaleString() || '0'}
                    change=""
                    trend="up"
                    icon={<Users2 className="h-4 w-4 text-yellow-500" />}
                />
                <MetricCard
                    title="Revenue"
                    value={`£${(overview.monthlyRevenuePence / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    change="Monthly"
                    trend="up"
                    icon={<DollarSign className="h-4 w-4 text-green-500" />}
                />
                <MetricCard
                    title="Mail"
                    value={overview.mailProcessed.toLocaleString()}
                    change=""
                    trend="up"
                    icon={<Mail className="h-4 w-4 text-purple-500" />}
                />
                <MetricCard
                    title="Forwards"
                    value={overview.activeForwards.toLocaleString()}
                    change="Active"
                    trend="up"
                    icon={<Truck className="h-4 w-4 text-orange-500" />}
                />
            </div>

            {/* Forwarding Requests Summary */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Forwarding Requests
                        {isLoadingForwarding && (
                            <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                        )}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={onViewForwarding} className="text-xs">
                        View All
                    </Button>
                </CardHeader>
                <CardContent className="py-3">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{forwardingStats.requested}</div>
                            <div className="text-xs text-muted-foreground">Requested</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">{forwardingStats.reviewed}</div>
                            <div className="text-xs text-muted-foreground">Reviewed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{forwardingStats.processing}</div>
                            <div className="text-xs text-muted-foreground">Processing</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">{forwardingStats.dispatched}</div>
                            <div className="text-xs text-muted-foreground">Dispatched</div>
                        </div>
                    </div>

                    {forwardingRequests.length > 0 && (
                        <div className="space-y-1">
                            <h4 className="font-medium text-xs text-muted-foreground">Recent Requests</h4>
                            <div className="space-y-1">
                                {forwardingRequests.slice(0, 3).map((request: any) => (
                                    <div key={request.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={
                                                request.status === 'Requested' ? 'default' :
                                                    request.status === 'Reviewed' ? 'secondary' :
                                                        request.status === 'Processing' ? 'outline' :
                                                            request.status === 'Dispatched' ? 'destructive' : 'secondary'
                                            } className="text-xs px-1 py-0">
                                                {request.status}
                                            </Badge>
                                            <span className="font-medium truncate">{request.to_name}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(request.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {forwardingRequests.length === 0 && !isLoadingForwarding && (
                        <div className="text-center py-2 text-muted-foreground">
                            <Truck className="h-6 w-6 mx-auto mb-1 opacity-50" />
                            <p className="text-xs">No forwarding requests</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Activity */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                        <Button variant="outline" size="sm" className="text-xs">View All</Button>
                    </CardHeader>
                    <CardContent className="py-3">
                        <div className="space-y-2">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity: any, index: number) => (
                                    <ActivityItem
                                        key={index}
                                        icon={<UserCheck className="h-3 w-3 text-green-500" />}
                                        title={activity.title || "Activity"}
                                        description={activity.description || "No description"}
                                        time={activity.time || "Unknown time"}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    <Activity className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                    <p className="text-xs">No activity yet</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* System Status */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-base">System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                        <div className="space-y-2">
                            <StatusItem
                                label="Mail Processing API"
                                status="operational"
                                uptime="99.98%"
                            />
                            <StatusItem
                                label="KYC Verification (Sumsub)"
                                status="operational"
                                uptime="99.95%"
                            />
                            <StatusItem
                                label="Payment Gateway"
                                status="operational"
                                uptime="99.99%"
                            />
                            <StatusItem
                                label="Database Performance"
                                status="warning"
                                uptime="97.82%"
                            />
                            <StatusItem
                                label="Email Notifications"
                                status="operational"
                                uptime="99.87%"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pending Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <PendingAction
                                priority="high"
                                title="KYC Reviews"
                                count={Number(totals && typeof totals === 'object' && 'pending_kyc' in totals ? totals.pending_kyc || 0 : 0)}
                                action="Review Pending"
                            />
                            <PendingAction
                                priority="medium"
                                title="Suspended Users"
                                count={Number(totals && typeof totals === 'object' && 'suspended_users' in totals ? totals.suspended_users || 0 : 0)}
                                action="Review Status"
                            />
                            <PendingAction
                                priority="low"
                                title="Active Forwards"
                                count={overview.activeForwards}
                                action="Process Queue"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* System Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">System Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Users</span>
                                <span className="font-semibold">{overview.users.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Deleted Users</span>
                                <span className="font-semibold text-red-600">{overview.deletedUsers.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Mail Processed</span>
                                <span className="font-semibold">{overview.mailProcessed.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Active Forwards</span>
                                <span className="font-semibold">{overview.activeForwards.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                                <span className="font-semibold">
                                    £{(overview.monthlyRevenuePence / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">System Status</span>
                                <span className="font-semibold text-green-600">Operational</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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

function PendingAction({ priority, title, count, action }: {
    priority: "high" | "medium" | "low";
    title: string;
    count: number;
    action: string;
}) {
    const priorityColors = {
        high: "text-red-600 bg-red-50",
        medium: "text-yellow-600 bg-yellow-50",
        low: "text-blue-600 bg-blue-50"
    };

    return (
        <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
                <Badge className={priorityColors[priority]} variant="secondary">
                    {priority}
                </Badge>
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{count} items</p>
                </div>
            </div>
            <Button size="sm" variant="outline">
                {action}
            </Button>
        </div>
    );
}
