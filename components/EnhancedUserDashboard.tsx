"use client";

import { useToast } from "./ui/use-toast";
import { useMemo, useState, useEffect } from "react";
import { apiClient } from "../lib/api-client";
import { VAHLogo } from "./VAHLogo";

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
import { Alert, AlertDescription } from "./ui/alert";
import {
    Inbox,
    Truck,
    CreditCard,
    Settings,
    HelpCircle,
    FileDown,
    ShieldCheck,
    RefreshCw,
    LogOut,
    Menu,
    X,
} from "lucide-react";

type MenuId = "inbox" | "forwarding" | "billing" | "certificates" | "kyc" | "settings" | "support";

interface UserDashboardProps {
    onLogout: () => void;
    onNavigate: (page: string) => void;
    onGoBack: () => void;
}

export function EnhancedUserDashboard({ onLogout, onNavigate, onGoBack }: UserDashboardProps) {
    const [activeSection, setActiveSection] = useState<MenuId>("inbox");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { toast } = useToast();

    // State management
    const [mailItems, setMailItems] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [mailResponse, profileResponse, subscriptionResponse, ticketsResponse] = await Promise.all([
                    apiClient.get('/api/mail-items'),
                    apiClient.get('/api/profile'),
                    apiClient.get('/api/subscription'),
                    apiClient.get('/api/support/tickets')
                ]);

                if (mailResponse.ok) setMailItems(mailResponse.data || []);
                if (profileResponse.ok) setProfile(profileResponse.data);
                if (subscriptionResponse.ok) setSubscription(subscriptionResponse.data);
                if (ticketsResponse.ok) setSupportTickets(ticketsResponse.data || []);
            } catch (err) {
                setError('Failed to load data');
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Refetch functions
    const refetchMail = () => apiClient.get('/api/mail-items').then(r => r.ok && setMailItems(r.data || []));
    const refetchProfile = () => apiClient.get('/api/profile').then(r => r.ok && setProfile(r.data));
    const refetchSubscription = () => apiClient.get('/api/subscription').then(r => r.ok && setSubscription(r.data));
    const refetchTickets = () => apiClient.get('/api/support/tickets').then(r => r.ok && setSupportTickets(r.data || []));

    // Derived state
    const kycStatus = profile?.kycStatus || "not_started";
    const hasForwardingAddress = Boolean(profile?.address);
    const planActive = subscription?.data?.status === "active" || subscription?.data?.plan?.status === "active";

    // Menu items
    const menuItems: {
        id: MenuId;
        label: string;
        icon: React.ReactNode;
    }[] = [
        { id: "inbox", label: "Inbox", icon: <Inbox className="h-4 w-4" /> },
        { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
        { id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> },
        { id: "certificates", label: "Certificates", icon: <FileDown className="h-4 w-4" /> },
        { id: "kyc", label: "KYC", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
        { id: "support", label: "Support", icon: <HelpCircle className="h-4 w-4" /> },
    ];

    // Actions
    const handleRefresh = () => {
        refetchMail();
        refetchProfile();
        refetchSubscription();
        refetchTickets();
        toast({ title: "Success", description: "Dashboard refreshed" });
    };

    const openMail = async (id: string) => {
        try {
            const response = await apiClient.get(`/api/mail-items/${id}`);
            if (response.ok && response.data) {
                await apiClient.post(`/api/mail-items/${id}/mark-read`);
                refetchMail();
                toast({ title: "Success", description: `Opened "${response.data.description || "Mail"}".` });
            } else {
                throw new Error("Mail not found");
            }
        } catch {
            toast({ title: "Error", description: "Failed to open mail.", variant: "destructive" });
        }
    };

    const downloadMailPdf = async (id: string) => {
        try {
            const response = await apiClient.get(`/api/mail-items/${id}/scan-url`);
            if (response.ok && response.data?.url) {
                const a = document.createElement("a");
                a.href = response.data.url;
                a.download = `mail-${id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast({ title: "Download", description: "Downloading scan…" });
            } else {
                throw new Error("No download URL available");
            }
        } catch {
            toast({ title: "Error", description: "Failed to download PDF.", variant: "destructive" });
        }
    };

    // Render content based on active section
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading...</span>
                </div>
            );
        }

        if (error) {
            return (
                <Alert>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }

        switch (activeSection) {
            case "inbox":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Mail Inbox</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {mailItems.length === 0 ? (
                                <p className="text-muted-foreground">No mail items found.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Sender</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mailItems.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{item.sender}</TableCell>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant={item.isRead ? "secondary" : "default"}>
                                                        {item.isRead ? "Read" : "New"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => openMail(item.id)}>
                                                            View
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => downloadMailPdf(item.id)}>
                                                            Download
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                );

            case "forwarding":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Mail Forwarding</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Forwarding management coming soon.</p>
                        </CardContent>
                    </Card>
                );

            case "billing":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Billing & Subscription</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Billing management coming soon.</p>
                        </CardContent>
                    </Card>
                );

            case "certificates":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Certificates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Certificate management coming soon.</p>
                        </CardContent>
                    </Card>
                );

            case "kyc":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>KYC Verification</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">KYC status: {kycStatus}</p>
                        </CardContent>
                    </Card>
                );

            case "settings":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Settings management coming soon.</p>
                        </CardContent>
                    </Card>
                );

            case "support":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Support</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Support tickets: {supportTickets.length}</p>
                        </CardContent>
                    </Card>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="flex flex-col lg:flex-row">
                {/* Mobile Header */}
                <div className="lg:hidden bg-card border-b border-border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <VAHLogo size="sm" showText={false} />
                            <div>
                                <h2 className="font-semibold text-sm">VirtualAddressHub</h2>
                                <p className="text-xs text-muted-foreground">Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2"
                            >
                                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onLogout}
                                className="text-xs"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {menuItems.map((item) => (
                                <Button
                                    key={item.id}
                                    variant={activeSection === item.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        setActiveSection(item.id);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="justify-start text-xs h-9 break-words"
                                >
                                    {item.icon}
                                    <span className="ml-2">{item.label}</span>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop Sidebar */}
                <div className="hidden lg:flex w-64 shrink-0 bg-card border-r border-border">
                    <div className="w-full p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <VAHLogo size="sm" showText={false} />
                            <div>
                                <h2 className="font-semibold text-sm">VirtualAddressHub</h2>
                                <p className="text-xs text-muted-foreground">Dashboard</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {menuItems.map((item) => (
                                <Button
                                    key={item.id}
                                    variant={activeSection === item.id ? "default" : "ghost"}
                                    onClick={() => setActiveSection(item.id)}
                                    className="w-full justify-start"
                                >
                                    {item.icon}
                                    <span className="ml-2">{item.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-screen">
                    {/* Desktop Header */}
                    <div className="hidden lg:flex items-center justify-between p-6 bg-card border-b border-border">
                        <div>
                            <h1 className="text-2xl font-bold">{menuItems.find(m => m.id === activeSection)?.label}</h1>
                            <p className="text-muted-foreground">Manage your virtual address and mail</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                            <Button variant="outline" onClick={onLogout}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}