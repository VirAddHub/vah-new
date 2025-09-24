"use client";

import { useState, useEffect } from "react";
import { apiClient, type User, type MailItem, type ForwardingRequest } from "@/lib/api-client";
import { Button } from "../ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
import { VAHLogo } from "../VAHLogo";

// API Integration utilities
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

// Import section components
import { OverviewSection } from "./OverviewSection";
import { UsersSection } from "./UsersSection";
import { MailSection } from "./MailSection";
import { ForwardingSection } from "./ForwardingSection";
import { BillingSection } from "./BillingSection";
import { AnalyticsSection } from "./AnalyticsSection";
import { SettingsSection } from "./SettingsSection";

interface AdminDashboardProps {
    onLogout: () => void;
    onNavigate?: (page: string, data?: any) => void;
    onGoBack?: () => void;
}

type AdminSection = "overview" | "users" | "mail" | "forwarding" | "billing" | "analytics" | "settings";

export function AdminDashboard({ onLogout, onNavigate, onGoBack }: AdminDashboardProps) {
    const [activeSection, setActiveSection] = useState<AdminSection>("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // API Data State
    const [users, setUsers] = useState<User[]>([]);
    const [mailItems, setMailItems] = useState<MailItem[]>([]);
    const [forwardingRequests, setForwardingRequests] = useState<ForwardingRequest[]>([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalMail: 0,
        pendingForwarding: 0,
        totalRevenue: 0
    });

    // Load admin data
    useEffect(() => {
        const loadAdminData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [usersResponse, mailResponse, forwardingResponse] = await Promise.all([
                    apiClient.get('/api/admin/users'),
                    apiClient.get('/api/admin/mail-items'),
                    apiClient.get('/api/admin/forwarding-requests')
                ]);

                if (usersResponse.ok) {
                    setUsers(usersResponse.data || []);
                    setStats(prev => ({ ...prev, totalUsers: usersResponse.data?.length || 0 }));
                }

                if (mailResponse.ok) {
                    setMailItems(mailResponse.data || []);
                    setStats(prev => ({ ...prev, totalMail: mailResponse.data?.length || 0 }));
                }

                if (forwardingResponse.ok) {
                    const requests = forwardingResponse.data || [];
                    setForwardingRequests(requests);
                    const pending = requests.filter(r => r.status === 'pending').length;
                    setStats(prev => ({ ...prev, pendingForwarding: pending }));
                }

            } catch (err) {
                console.error('Failed to load admin data:', err);
                setError('Failed to load admin data');
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

    const handleRefresh = async () => {
        setLoading(true);
        setError(null);
        try {
            await logAdminAction('admin_dashboard_refresh');
            // Trigger data refetch for all sections
            window.location.reload(); // Simple refresh for now
        } catch (err) {
            setError('Failed to refresh dashboard');
            await logAdminAction('admin_dashboard_refresh_error', { error: err instanceof Error ? err.message : String(err) });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_export_data', { section: activeSection });
            // Implement export functionality based on active section
            const response = await apiClient.get(`/api/admin/export/${activeSection}`);
            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeSection}-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (err) {
            setError('Failed to export data');
            await logAdminAction('admin_export_error', { error: err instanceof Error ? err.message : String(err) });
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        switch (activeSection) {
            case "overview":
                return <OverviewSection />;
            case "users":
                return <UsersSection onNavigate={onNavigate} />;
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
                return <OverviewSection />;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 m-4 rounded-md">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                        <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

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
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={handleRefresh}
                                disabled={loading}
                            >
                                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={handleExport}
                                disabled={loading}
                            >
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
