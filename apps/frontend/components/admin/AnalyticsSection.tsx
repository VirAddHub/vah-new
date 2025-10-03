"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Users,
    Mail,
    DollarSign,
    Download,
    Calendar,
    Activity,
} from "lucide-react";
import { apiClient, safe, adminApi } from "../../lib/apiClient";
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

interface AnalyticsData {
    userGrowth: {
        total: number;
        growth: number;
        newUsers: number;
        activeUsers: number;
    };
    revenue: {
        total: number;
        growth: number;
        monthly: number;
        yearly: number;
    };
    mailVolume: {
        total: number;
        growth: number;
        monthly: number;
        processed: number;
    };
    planDistribution: {
        basic: number;
        premium: number;
        professional: number;
    };
}

type AnalyticsSectionProps = Record<string, never>;

export function AnalyticsSection({ }: AnalyticsSectionProps) {
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("30d");
    const [selectedMetric, setSelectedMetric] = useState("overview");
    const [analytics, setAnalytics] = useState<any>(null);

    // Load analytics data
    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const response = await adminApi.analytics(timeRange);
            if (response.ok) {
                setAnalytics(response.data);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, [timeRange]);

    const handleExportAnalytics = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_export_analytics', { timeRange, metric: selectedMetric });

            const response = await apiClient.get(`/api/admin/analytics/export?timeRange=${timeRange}&metric=${selectedMetric}`);

            const blob = new Blob([JSON.stringify(response)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${selectedMetric}-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (error) {
            await logAdminAction('admin_export_analytics_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async (reportType: string) => {
        setLoading(true);
        try {
            await logAdminAction('admin_generate_report', { reportType, timeRange });

            const response = await apiClient.post('/api/admin/analytics/reports', {
                reportType,
                timeRange,
                format: 'pdf'
            });

            if (!response.ok) {
                throw new Error(response.message);
            }
            const blob = new Blob([JSON.stringify(response.data)], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}-report-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
        } catch (error) {
            await logAdminAction('admin_generate_report_error', { reportType, timeRange, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">Detailed insights and performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportAnalytics}
                        disabled={loading}
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                                <p className="text-2xl font-bold">{analytics?.userGrowth?.total?.toLocaleString() || "0"}</p>
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    +{analytics?.userGrowth.growth}% growth
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                                <p className="text-2xl font-bold">£{analytics?.revenue.monthly.toLocaleString()}</p>
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    +{analytics?.revenue.growth}% growth
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
                                <p className="text-2xl font-bold">{analytics?.mailVolume.monthly.toLocaleString()}</p>
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    +{analytics?.mailVolume.growth}% growth
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
                                <p className="text-sm text-muted-foreground">Active Users</p>
                                <p className="text-2xl font-bold">{analytics?.userGrowth.activeUsers.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">
                                    {((analytics?.userGrowth.activeUsers / analytics?.userGrowth.total) * 100).toFixed(1)}% of total
                                </p>
                            </div>
                            <Activity className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>User Growth</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateReport('user-growth')}
                            disabled={loading}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">User growth chart would be displayed here</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Shows new registrations, activations, and churn over time
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Trends Chart */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Revenue Trends</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateReport('revenue-trends')}
                            disabled={loading}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <div className="text-center">
                            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Revenue trends chart would be displayed here</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Shows monthly recurring revenue, one-time payments, and refunds
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Mail Volume Chart */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Mail Volume</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateReport('mail-volume')}
                            disabled={loading}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <div className="text-center">
                            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Mail volume chart would be displayed here</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Shows incoming mail, processing times, and forwarding volumes
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Plan Distribution Chart */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Plan Distribution</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateReport('plan-distribution')}
                            disabled={loading}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <div className="text-center">
                            <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Plan distribution chart would be displayed here</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Shows breakdown of Basic ({analytics?.planDistribution.basic}%),
                                Premium ({analytics?.planDistribution.premium}%),
                                and Professional ({analytics?.planDistribution.professional}%) plans
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Metrics Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold">User Metrics</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">New Users ({timeRange})</span>
                                    <span className="font-medium">{analytics?.userGrowth.newUsers}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Active Users</span>
                                    <span className="font-medium">{analytics?.userGrowth.activeUsers}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Growth Rate</span>
                                    <span className="font-medium text-green-600">+{analytics?.userGrowth.growth}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold">Revenue Metrics</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monthly Revenue</span>
                                    <span className="font-medium">£{analytics?.revenue.monthly.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Yearly Revenue</span>
                                    <span className="font-medium">£{analytics?.revenue.yearly.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Growth Rate</span>
                                    <span className="font-medium text-green-600">+{analytics?.revenue.growth}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold">Mail Metrics</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Processed</span>
                                    <span className="font-medium">{analytics?.mailVolume.processed.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monthly Volume</span>
                                    <span className="font-medium">{analytics?.mailVolume.monthly.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Growth Rate</span>
                                    <span className="font-medium text-green-600">+{analytics?.mailVolume.growth}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
