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
    UserPlus,
    Send,
    RefreshCw,
    HelpCircle,
    ShieldCheck,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useApiData } from "../../lib/client-hooks";

const logAdminAction = async (action: string, data?: any) => {
    try {
        await apiClient.post('/api/audit/admin-action', {
            action,
            data,
            timestamp: new Date().toISOString(),
            adminId: null // Will be set by backend
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
};
import { getErrorMessage, getErrorStack } from "../../lib/errors";

interface AdminStats {
    totalUsers: number;
    monthlyRevenue: number;
    mailProcessed: number;
    activeForwards: number;
    userGrowth: number;
    revenueGrowth: number;
    mailGrowth: number;
    forwardGrowth: number;
}

interface SystemHealth {
    label: string;
    status: string;
    uptime: string;
}

interface RecentActivity {
    title: string;
    description: string;
    time: string;
}

export function OverviewSection() {
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // API Data fetching
    const { data: adminStats, isLoading: statsLoading, refetch: refetchStats } = useApiData('/api/admin/stats');
    const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'down'>('operational');
    const { data: recentActivity, isLoading: activityLoading, refetch: refetchActivity } = useApiData('/api/admin/activity');
    const { data: pendingActions, isLoading: pendingLoading, refetch: refetchPending } = useApiData('/api/admin/pending');

    // Check system health
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const response = await fetch('/api/healthz');
                setSystemStatus(response.ok ? 'operational' : 'down');
            } catch (error) {
                setSystemStatus('down');
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);


    const handleViewAllActivity = async () => {
        try {
            await logAdminAction('admin_view_all_activity');
            // Navigate to activity page or open modal
            window.open('/admin/activity', '_blank');
        } catch (error) {
            await logAdminAction('admin_view_activity_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const getActivityIcon = (iconType: string) => {
        switch (iconType) {
            case 'user-plus':
                return <UserPlus className="h-4 w-4" />;
            case 'mail':
                return <Mail className="h-4 w-4" />;
            case 'truck':
                return <Truck className="h-4 w-4" />;
            case 'credit-card':
                return <CreditCard className="h-4 w-4" />;
            case 'shield-check':
                return <ShieldCheck className="h-4 w-4" />;
            case 'send':
                return <Send className="h-4 w-4" />;
            case 'refresh-cw':
                return <RefreshCw className="h-4 w-4" />;
            case 'help-circle':
                return <HelpCircle className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const getActivityIconColor = (colorClass: string) => {
        switch (colorClass) {
            case 'text-green-500':
                return 'bg-green-100 text-green-600';
            case 'text-blue-500':
                return 'bg-blue-100 text-blue-600';
            case 'text-orange-500':
                return 'bg-orange-100 text-orange-600';
            case 'text-purple-500':
                return 'bg-purple-100 text-purple-600';
            case 'text-yellow-500':
                return 'bg-yellow-100 text-yellow-600';
            default:
                return 'bg-muted text-muted-foreground';
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

    const stats = adminStats as AdminStats | null;
    const activityData = recentActivity as { activities: RecentActivity[], todayStats: { newSignups: number, mailProcessed: number, forwardingRequests: number } } | null;
    const activity = activityData?.activities || [];
    const todayStats = activityData?.todayStats || { newSignups: 0, mailProcessed: 0, forwardingRequests: 0 };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Overview</h1>
                    <p className="text-muted-foreground">Real-time system status and key performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={`gap-2 ${systemStatus === 'operational' ? 'border-green-500' :
                                systemStatus === 'degraded' ? 'border-yellow-500' :
                                    'border-red-500'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus === 'operational' ? 'bg-green-500' :
                                systemStatus === 'degraded' ? 'bg-yellow-500' :
                                    'bg-red-500'
                            }`} />
                        {systemStatus === 'operational' ? 'System Operational' :
                            systemStatus === 'degraded' ? 'System Degraded' :
                                'System Down'}
                    </Badge>
                </div>
            </div>

            {/* Key Metrics Grid */}
            {!stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center text-muted-foreground">
                                No stats data available
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Users</p>
                                    <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <ArrowUp className="h-3 w-3" />
                                        +{stats.userGrowth || 0}%
                                    </p>
                                </div>
                                <Users2 className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                                    <p className="text-2xl font-bold">£{stats.monthlyRevenue?.toLocaleString() || "0"}</p>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <ArrowUp className="h-3 w-3" />
                                        +{stats.revenueGrowth || 0}%
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Mail Processed</p>
                                    <p className="text-2xl font-bold">{stats.mailProcessed?.toLocaleString() || "0"}</p>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <ArrowUp className="h-3 w-3" />
                                        +{stats.mailGrowth || 0}%
                                    </p>
                                </div>
                                <Mail className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Forwards</p>
                                    <p className="text-2xl font-bold">{stats.activeForwards || 0}</p>
                                    <p className="text-xs text-red-600 flex items-center gap-1">
                                        <ArrowDown className="h-3 w-3" />
                                        {stats.forwardGrowth || 0}%
                                    </p>
                                </div>
                                <Truck className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Today's Activity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">New Signups Today</p>
                                <p className="text-2xl font-bold">{todayStats.newSignups}</p>
                                <p className="text-xs text-blue-600">
                                    Since midnight
                                </p>
                            </div>
                            <Users2 className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Mail Processed Today</p>
                                <p className="text-2xl font-bold">{todayStats.mailProcessed}</p>
                                <p className="text-xs text-green-600">
                                    Since midnight
                                </p>
                            </div>
                            <Mail className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Forwarding Requests Today</p>
                                <p className="text-2xl font-bold">{todayStats.forwardingRequests}</p>
                                <p className="text-xs text-orange-600">
                                    Since midnight
                                </p>
                            </div>
                            <Truck className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleViewAllActivity}>
                        View All
                    </Button>
                </CardHeader>
                <CardContent>
                    {activity.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No recent activity
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activity.slice(0, 5).map((item: any, index: number) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${getActivityIconColor(item.iconColor)}`}>
                                        {getActivityIcon(item.icon)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                        <p className="text-xs text-muted-foreground">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}