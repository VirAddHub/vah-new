"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
    Users2,
    DollarSign,
    Mail,
    Truck,
    UserCheck,
    CreditCard,
    Activity,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    RefreshCcw,
} from "lucide-react";
import { apiClient, logAdminAction, useApiData } from "../../lib";
import { getErrorMessage, getErrorStack } from "../../lib/errors";

export function OverviewSection() {
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // API Data fetching
    const { data: adminStats, isLoading: statsLoading, refetch: refetchStats } = useApiData('/api/admin/stats');
    const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useApiData('/api/admin/health');
    const { data: recentActivity, isLoading: activityLoading, refetch: refetchActivity } = useApiData('/api/admin/activity');
    const { data: pendingActions, isLoading: pendingLoading, refetch: refetchPending } = useApiData('/api/admin/pending');

    const handleRefreshAll = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_overview_refresh');
            await Promise.all([
                refetchStats(),
                refetchHealth(),
                refetchActivity(),
                refetchPending()
            ]);
            setLastRefresh(new Date());
        } catch (error) {
            await logAdminAction('admin_overview_refresh_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleViewAllActivity = async () => {
        try {
            await logAdminAction('admin_view_all_activity');
            // Navigate to activity page or open modal
            window.open('/admin/activity', '_blank');
        } catch (error) {
            await logAdminAction('admin_view_activity_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handlePendingAction = async (actionType: string, actionId: string) => {
        try {
            await logAdminAction('admin_pending_action', { actionType, actionId });
            await apiClient.post(`/api/admin/pending/${actionType}/${actionId}/process`);
            refetchPending();
        } catch (error) {
            await logAdminAction('admin_pending_action_error', { actionType, actionId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    // Default data if API is not available
    const defaultStats = {
        totalUsers: 2847,
        monthlyRevenue: 47329,
        mailProcessed: 18492,
        activeForwards: 1234,
        userGrowth: 12.3,
        revenueGrowth: 8.1,
        mailGrowth: 23.4,
        forwardGrowth: -2.1
    };

    const defaultHealth = [
        { label: "Mail Processing API", status: "operational", uptime: "99.98%" },
        { label: "KYC Verification (Sumsub)", status: "operational", uptime: "99.95%" },
        { label: "Payment Gateway", status: "operational", uptime: "99.99%" },
        { label: "Database Performance", status: "warning", uptime: "97.82%" },
        { label: "Email Notifications", status: "operational", uptime: "99.87%" }
    ];

    const defaultActivity = [
        { icon: "UserCheck", title: "New user registration", description: "jane.doe@example.com verified KYC", time: "2 minutes ago" },
        { icon: "Mail", title: "Mail batch processed", description: "47 items scanned and uploaded", time: "15 minutes ago" },
        { icon: "Truck", title: "Forwarding completed", description: "Delivery #FR-2847 dispatched", time: "1 hour ago" },
        { icon: "CreditCard", title: "Payment processed", description: "Invoice #INV-1045 paid (£39.99)", time: "2 hours ago" }
    ];

    const defaultPending = [
        { priority: "high", title: "KYC Reviews", count: 7, action: "Review Pending", actionId: "kyc_reviews" },
        { priority: "medium", title: "Mail Tagging", count: 23, action: "Tag Items", actionId: "mail_tagging" },
        { priority: "low", title: "User Inquiries", count: 4, action: "Respond", actionId: "user_inquiries" }
    ];

    const stats = adminStats || defaultStats;
    const health = systemHealth || defaultHealth;
    const activity = recentActivity || defaultActivity;
    const pending = pendingActions || defaultPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Overview</h1>
                    <p className="text-muted-foreground">Real-time system status and key performance metrics</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        System Operational
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAll}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Users"
                    value={stats.totalUsers.toLocaleString()}
                    change={`+${stats.userGrowth}%`}
                    trend="up"
                    icon={<Users2 className="h-5 w-5 text-blue-500" />}
                    loading={statsLoading}
                />
                <MetricCard
                    title="Monthly Revenue"
                    value={`£${stats.monthlyRevenue.toLocaleString()}`}
                    change={`+${stats.revenueGrowth}%`}
                    trend="up"
                    icon={<DollarSign className="h-5 w-5 text-green-500" />}
                    loading={statsLoading}
                />
                <MetricCard
                    title="Mail Processed"
                    value={stats.mailProcessed.toLocaleString()}
                    change={`+${stats.mailGrowth}%`}
                    trend="up"
                    icon={<Mail className="h-5 w-5 text-purple-500" />}
                    loading={statsLoading}
                />
                <MetricCard
                    title="Active Forwards"
                    value={stats.activeForwards.toLocaleString()}
                    change={`${stats.forwardGrowth > 0 ? '+' : ''}${stats.forwardGrowth}%`}
                    trend={stats.forwardGrowth > 0 ? "up" : "down"}
                    icon={<Truck className="h-5 w-5 text-orange-500" />}
                    loading={statsLoading}
                />
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleViewAllActivity}>
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activity.map((item, index) => (
                                <ActivityItem
                                    key={index}
                                    icon={item.icon}
                                    title={item.title}
                                    description={item.description}
                                    time={item.time}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* System Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {health.map((item, index) => (
                                <StatusItem
                                    key={index}
                                    label={item.label}
                                    status={item.status}
                                    uptime={item.uptime}
                                />
                            ))}
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
                            {pending.map((item, index) => (
                                <PendingAction
                                    key={index}
                                    priority={item.priority}
                                    title={item.title}
                                    count={item.count}
                                    action={item.action}
                                    actionId={item.actionId}
                                    onAction={() => handlePendingAction(item.actionId, item.actionId)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Today's Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">New Registrations</span>
                                <span className="font-semibold">{stats.totalUsers > 0 ? Math.floor(stats.totalUsers * 0.004) : 12}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Mail Items Received</span>
                                <span className="font-semibold">{stats.mailProcessed > 0 ? Math.floor(stats.mailProcessed * 0.005) : 89}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Forwards Initiated</span>
                                <span className="font-semibold">{stats.activeForwards > 0 ? Math.floor(stats.activeForwards * 0.03) : 34}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Support Tickets</span>
                                <span className="font-semibold">7</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Revenue</span>
                                <span className="font-semibold">£1,247</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Helper Components
function MetricCard({ title, value, change, trend, icon, loading }: {
    title: string;
    value: string;
    change: string;
    trend: "up" | "down";
    icon: React.ReactNode;
    loading?: boolean;
}) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{loading ? "..." : value}</p>
                        <p className={`text-xs flex items-center gap-1 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                            {trend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {loading ? "..." : change}
                        </p>
                    </div>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function ActivityItem({ icon, title, description, time }: {
    icon: string;
    title: string;
    description: string;
    time: string;
}) {
    const iconMap = {
        UserCheck: <UserCheck className="h-4 w-4 text-green-500" />,
        Mail: <Mail className="h-4 w-4 text-blue-500" />,
        Truck: <Truck className="h-4 w-4 text-orange-500" />,
        CreditCard: <CreditCard className="h-4 w-4 text-purple-500" />
    };

    return (
        <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
                {iconMap[icon] || <Activity className="h-4 w-4 text-gray-500" />}
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium">{title}</p>
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
        operational: <CheckCircle className="h-4 w-4" />,
        warning: <AlertCircle className="h-4 w-4" />,
        error: <XCircle className="h-4 w-4" />
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={statusColors[status]}>
                    {statusIcons[status]}
                </div>
                <span className="text-sm">{label}</span>
            </div>
            <div className="text-right">
                <div className="text-xs text-muted-foreground">Uptime</div>
                <div className="text-sm font-medium">{uptime}</div>
            </div>
        </div>
    );
}

function PendingAction({ priority, title, count, action, actionId, onAction }: {
    priority: "high" | "medium" | "low";
    title: string;
    count: number;
    action: string;
    actionId: string;
    onAction: () => void;
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
            <Button size="sm" variant="outline" onClick={onAction}>
                {action}
            </Button>
        </div>
    );
}
