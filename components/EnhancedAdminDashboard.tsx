"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { apiClient, safe } from "../lib/api-client";
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
    RefreshCcw,
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
import UsersSection from "./admin/UsersSection";

interface AdminDashboardProps {
    onLogout: () => void;
    onNavigate?: (page: string, data?: any) => void;
    onGoBack?: () => void;
}

type AdminSection = "overview" | "users" | "mail" | "forwarding" | "billing" | "analytics" | "settings";

export function EnhancedAdminDashboard({ onLogout, onNavigate, onGoBack }: AdminDashboardProps) {
    const [activeSection, setActiveSection] = useState<AdminSection>("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Data loading state
    const [users, setUsers] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load admin data
    useEffect(() => {
        const loadAdminData = async () => {
            try {
                setLoading(true);
                const [usersResponse, metricsResponse] = await Promise.all([
                    apiClient.get('/api/admin/users?page=1&page_size=20'),
                    apiClient.get('/api/admin/metrics')
                ]);

                if (usersResponse.ok) setUsers(safe(usersResponse.data?.items, []));
                if (metricsResponse.ok) setMetrics(metricsResponse.data);
            } catch (err) {
                setError('Failed to load admin data');
                console.error('Error loading admin data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadAdminData();
    }, []);

    const menuItems = [
        { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
        { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
        { id: "mail", label: "Mail", icon: <Mail className="h-4 w-4" /> },
        { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
        { id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> },
        { id: "analytics", label: "Analytics", icon: <PieChart className="h-4 w-4" /> },
        { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ] as const;

    const renderContent = () => {
        switch (activeSection) {
            case "overview":
                return <OverviewSection metrics={metrics} />;
            case "users":
                return <UsersSection />;
            case "mail":
                return <MailSection />;
            case "forwarding":
                return <ForwardingSection />;
            case "billing":
                return <BillingSection />;
            case "analytics":
                return <AnalyticsSection />;
            case "settings":
                return <SettingsSection />;
            default:
                return <OverviewSection metrics={metrics} />;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation Header */}
            <header className="bg-card border-b border-border">
                <div className="flex items-center justify-between h-14 px-4">
                    {/* Logo and Branding */}
                    <div className="flex items-center gap-2">
                        <VAHLogo size="sm" showText={false} />
                        <div>
                            <h2 className="font-semibold text-sm text-primary">Admin Portal</h2>
                            <p className="text-xs text-muted-foreground hidden sm:block">VirtualAddressHub</p>
                        </div>
                    </div>

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
                                <RefreshCcw className="h-4 w-4" />
                            </Button>
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
function OverviewSection({ metrics }: { metrics: any }) {
    const totals = safe(metrics?.totals, {});
    const systemHealth = safe(metrics?.system_health, {});
    const recentActivity = safe(metrics?.recent_activity, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Overview</h1>
                    <p className="text-muted-foreground">Real-time system status and key performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${(systemHealth as any)?.status === 'operational' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                        {(systemHealth as any)?.status === 'operational' ? 'System Operational' : 'System Issues'}
                    </Badge>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Users"
                    value={totals && typeof totals === 'object' && 'users' in totals ? totals.users?.toLocaleString() || "0" : "0"}
                    change=""
                    trend="up"
                    icon={<Users2 className="h-5 w-5 text-blue-500" />}
                />
                <MetricCard
                    title="Monthly Revenue"
                    value={(() => {
                        const p = Number((totals as any)?.monthly_revenue_pence ?? 0);
                        return `£${(p / 100).toLocaleString()}`;
                    })()}
                    change=""
                    trend="up"
                    icon={<DollarSign className="h-5 w-5 text-green-500" />}
                />
                <MetricCard
                    title="Mail Processed"
                    value={totals && typeof totals === 'object' && 'mail_processed' in totals ? totals.mail_processed?.toLocaleString() || "0" : "0"}
                    change=""
                    trend="up"
                    icon={<Mail className="h-5 w-5 text-purple-500" />}
                />
                <MetricCard
                    title="Active Forwards"
                    value={totals && typeof totals === 'object' && 'active_forwards' in totals ? totals.active_forwards?.toLocaleString() || "0" : "0"}
                    change=""
                    trend="up"
                    icon={<Truck className="h-5 w-5 text-orange-500" />}
                />
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                        <Button variant="outline" size="sm">View All</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity: any, index: number) => (
                                    <ActivityItem
                                        key={index}
                                        icon={<UserCheck className="h-4 w-4 text-green-500" />}
                                        title={activity.title || "Activity"}
                                        description={activity.description || "No description"}
                                        time={activity.time || "Unknown time"}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No activity yet</p>
                                </div>
                            )}
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
                                count={0}
                                action="Review Pending"
                            />
                            <PendingAction
                                priority="medium"
                                title="Mail Tagging"
                                count={0}
                                action="Tag Items"
                            />
                            <PendingAction
                                priority="low"
                                title="User Inquiries"
                                count={0}
                                action="Respond"
                            />
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
                                <span className="font-semibold">0</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Mail Items Received</span>
                                <span className="font-semibold">0</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Forwards Initiated</span>
                                <span className="font-semibold">0</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Support Tickets</span>
                                <span className="font-semibold">0</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Revenue</span>
                                <span className="font-semibold">£0</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


function MailSection() {
    const [selectedTab, setSelectedTab] = useState("received");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Mail Management</h1>
                    <p className="text-muted-foreground">Process and manage incoming mail and packages</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Item
                    </Button>
                </div>
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="received">Received</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="processed">Processed</TabsTrigger>
                    <TabsTrigger value="forwarded">Forwarded</TabsTrigger>
                </TabsList>

                <TabsContent value="received" className="space-y-4">
                    <MailTable status="received" />
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                    <MailTable status="pending" />
                </TabsContent>

                <TabsContent value="processed" className="space-y-4">
                    <MailTable status="processed" />
                </TabsContent>

                <TabsContent value="forwarded" className="space-y-4">
                    <MailTable status="forwarded" />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ForwardingSection() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Forwarding Management</h1>
                    <p className="text-muted-foreground">Track and manage mail forwarding requests</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Forwarding Queue */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Forwarding Queue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Forwarding management interface coming soon...</p>
                </CardContent>
            </Card>
        </div>
    );
}

function BillingSection() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Billing & Revenue</h1>
                    <p className="text-muted-foreground">Monitor payments, invoices, and revenue metrics</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Reports
                </Button>
            </div>

            {/* Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                                <p className="text-2xl font-bold">£0</p>
                                <p className="text-xs text-muted-foreground">
                                    No data available
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Outstanding Invoices</p>
                                <p className="text-2xl font-bold">£0</p>
                                <p className="text-xs text-muted-foreground">No pending payments</p>
                            </div>
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Churn Rate</p>
                                <p className="text-2xl font-bold">0%</p>
                                <p className="text-xs text-muted-foreground">
                                    No data available
                                </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Billing management interface coming soon...</p>
                </CardContent>
            </Card>
        </div>
    );
}

function AnalyticsSection() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">Detailed insights and performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select defaultValue="30d">
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
                </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">Chart component would go here</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">Chart component would go here</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Mail Volume</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">Chart component would go here</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Plan Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">Chart component would go here</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SettingsSection() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">System Settings</h1>
                <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
            </div>

            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">General system configuration options coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Notification preferences coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Third-party Integrations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Integration management coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Security configuration coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
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
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        <p className={`text-xs flex items-center gap-1 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                            {trend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
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
        <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
                {icon}
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

function MailTable({ status }: { status: string }) {
    const demo: any[] = []; // No fake data

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Tag</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {demo.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No mail items found
                            </TableCell>
                        </TableRow>
                    ) : (
                        demo.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>#{item.id}</TableCell>
                                <TableCell>{item.user}</TableCell>
                                <TableCell>{item.sender}</TableCell>
                                <TableCell>{item.subject}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{item.tag}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{item.received}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Truck className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}
