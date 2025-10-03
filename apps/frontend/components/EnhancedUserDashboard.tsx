"use client";

import { useToast } from "./ui/use-toast";
import { useMemo, useState, useEffect } from "react";
import { apiClient, safe } from "../lib/apiClient";
import {
    mailService,
    forwardingService,
    billingService,
    profileService,
    kycService,
    supportService,
    plansService,
    emailPrefsService
} from "../lib/services";
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
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarProvider,
} from "./ui/sidebar";
import {
    Inbox,
    Truck,
    CreditCard,
    Settings,
    HelpCircle,
    FileDown,
    ShieldCheck,
    LogOut,
    Menu,
    X,
    Eye,
    Download,
    Forward,
    Building,
    FileText,
    FileArchive,
    AlertTriangle,
    Loader2,
    User,
} from "lucide-react";

type MenuId = "inbox" | "forwarding" | "billing" | "certificates" | "kyc" | "settings" | "support";

type MailStatus = "unread" | "read" | "forwarded";
type MailTag = "HMRC" | "Companies House" | "Bank" | "Legal" | "Other";

// Component interfaces
interface BannerProps {
    title: string;
    message: string;
    actionLabel: string;
    onAction: () => void;
}

interface UserDashboardProps {
    onLogout: () => void;
    onNavigate: (page: string) => void;
    onGoBack: () => void;
}

// Responsive Banner Component
const Banner: React.FC<BannerProps> = ({
    title,
    message,
    actionLabel,
    onAction
}) => (
    <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm">{message}</p>
                </div>
                <Button variant="outline" size="sm" onClick={onAction} className="w-full sm:w-auto">
                    {actionLabel}
                </Button>
            </div>
        </AlertDescription>
    </Alert>
);

const SkeletonBlock = ({ label }: { label: string }) => (
    <Card>
        <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">{label}</span>
            </div>
        </CardContent>
    </Card>
);

const ErrorBlock = ({
    label,
    detail,
    retry
}: {
    label: string;
    detail: string;
    retry: () => void;
}) => (
    <Card>
        <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">{label}</p>
            <p className="text-sm text-muted-foreground mt-1">{detail}</p>
            <Button variant="outline" size="sm" onClick={retry} className="mt-3">
                Try Again
            </Button>
        </CardContent>
    </Card>
);

export function EnhancedUserDashboard({ onLogout, onNavigate, onGoBack }: UserDashboardProps) {
    console.log('EnhancedUserDashboard: Component rendering...');

    const [activeSection, setActiveSection] = useState<MenuId>("inbox");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedMailId, setExpandedMailId] = useState<string | null>(null);
    const [mailDetails, setMailDetails] = useState<Record<string, any>>({});
    const { toast } = useToast();

    // Pagination state
    const [mailPage, setMailPage] = useState(1);
    const [forwardingPage, setForwardingPage] = useState(1);
    const [invoicesPage, setInvoicesPage] = useState(1);

    // Simple state for data
    const [mailItems, setMailItems] = useState<any[]>([]);
    const [mailLoading, setMailLoading] = useState(false);
    const [mailError, setMailError] = useState<string | null>(null);
    const [mailTotal, setMailTotal] = useState(0);

    const [forwardingRequests, setForwardingRequests] = useState<any[]>([]);
    const [forwardingLoading, setForwardingLoading] = useState(false);
    const [forwardingError, setForwardingError] = useState<string | null>(null);
    const [forwardingTotal, setForwardingTotal] = useState(0);

    const [invoices, setInvoices] = useState<any[]>([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [invoicesError, setInvoicesError] = useState<string | null>(null);
    const [invoicesTotal, setInvoicesTotal] = useState(0);

    // State management for non-paginated data
    const [profile, setProfile] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [supportTickets, setSupportTickets] = useState<any[]>([]);

    // Simple API call functions
    const loadMailItems = async () => {
        console.log('[EnhancedUserDashboard] loadMailItems - Starting...');
        setMailLoading(true);
        setMailError(null);
        try {
            const response = await mailService.getMailItems();
            console.log('[EnhancedUserDashboard] loadMailItems - Response:', response);
            if (response.ok) {
                // Service now guarantees response.data is always an array
                const items = Array.isArray(response.data) ? response.data : [];
                setMailItems(items);
                setMailTotal(items.length);
                console.log('[EnhancedUserDashboard] loadMailItems - Success, items:', items.length);
            } else {
                setMailError('Failed to load mail');
                console.error('[EnhancedUserDashboard] loadMailItems - Failed:', response);
            }
        } catch (error: any) {
            setMailError(error.message || 'Failed to load mail');
            console.error('[EnhancedUserDashboard] loadMailItems - Error:', error);
        } finally {
            setMailLoading(false);
        }
    };

    const loadForwardingRequests = async () => {
        console.log('[EnhancedUserDashboard] loadForwardingRequests - Starting...');
        setForwardingLoading(true);
        setForwardingError(null);
        try {
            const response = await forwardingService.getForwardingRequests();
            console.log('[EnhancedUserDashboard] loadForwardingRequests - Response:', response);
            if (response.ok) {
                // Service now guarantees response.data is always an array
                const items = Array.isArray(response.data) ? response.data : [];
                setForwardingRequests(items);
                setForwardingTotal(items.length);
                console.log('[EnhancedUserDashboard] loadForwardingRequests - Success, items:', items.length);
            } else {
                setForwardingError('Failed to load forwarding requests');
                console.error('[EnhancedUserDashboard] loadForwardingRequests - Failed:', response);
            }
        } catch (error: any) {
            setForwardingError(error.message || 'Failed to load forwarding requests');
            console.error('[EnhancedUserDashboard] loadForwardingRequests - Error:', error);
        } finally {
            setForwardingLoading(false);
        }
    };

    const loadInvoices = async () => {
        console.log('[EnhancedUserDashboard] loadInvoices - Starting...');
        setInvoicesLoading(true);
        setInvoicesError(null);
        try {
            const response = await billingService.getInvoices();
            console.log('[EnhancedUserDashboard] loadInvoices - Response:', response);
            if (response.ok) {
                // Service now guarantees response.data is always an array
                const items = Array.isArray(response.data) ? response.data : [];
                setInvoices(items);
                setInvoicesTotal(items.length);
                console.log('[EnhancedUserDashboard] loadInvoices - Success, items:', items.length);
            } else {
                setInvoicesError('Failed to load invoices');
                console.error('[EnhancedUserDashboard] loadInvoices - Failed:', response);
            }
        } catch (error: any) {
            setInvoicesError(error.message || 'Failed to load invoices');
            console.error('[EnhancedUserDashboard] loadInvoices - Error:', error);
        } finally {
            setInvoicesLoading(false);
        }
    };

    // Load data when component mounts or page changes
    useEffect(() => {
        loadMailItems();
    }, [mailPage]);

    useEffect(() => {
        loadForwardingRequests();
    }, [forwardingPage]);

    useEffect(() => {
        loadInvoices();
    }, [invoicesPage]);
    const [billing, setBilling] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [kycStatus, setKycStatus] = useState<any>(null);
    const [emailPrefs, setEmailPrefs] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load non-paginated data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [
                    profileResponse,
                    subscriptionResponse,
                    billingResponse,
                    plansResponse,
                    kycResponse,
                    emailPrefsResponse
                ] = await Promise.all([
                    profileService.getProfile(),
                    billingService.getSubscriptionStatus(),
                    billingService.getBillingOverview(),
                    plansService.getPlans(),
                    kycService.getStatus(),
                    emailPrefsService.getPreferences()
                ]);

                if (profileResponse.ok) {
                    setProfile(profileResponse.data);
                }
                if (subscriptionResponse.ok) {
                    setSubscription(subscriptionResponse.data);
                }
                if (billingResponse.ok) {
                    setBilling(billingResponse.data);
                }
                if (plansResponse.ok) {
                    setPlans(safe(plansResponse.data, []));
                }
                if (kycResponse.ok) setKycStatus(kycResponse.data);
                if (emailPrefsResponse.ok) {
                    setEmailPrefs(emailPrefsResponse.prefs ?? null);
                }
            } catch (err) {
                setError('Failed to load data');
                console.error('Error loading data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Refetch functions for non-paginated data
    const refetchProfile = () =>
        profileService.getProfile().then(r => r.ok && setProfile(r.data));

    const refetchSubscription = () =>
        billingService.getSubscriptionStatus().then(r => r.ok && setSubscription(r.data));

    const refetchTickets = () =>
        supportService.getTickets().then(r => r.ok && setSupportTickets(r.data));

    const refetchBilling = () => billingService.getBillingOverview().then(r => r.ok && setBilling(r.data));

    const refetchPlans = () =>
        plansService.getPlans().then(r => r.ok && setPlans(r.data));
    const refetchKyc = () =>
        kycService.getStatus().then(r => r.ok && setKycStatus(r.data));
    const refetchEmailPrefs = () => emailPrefsService.getPreferences().then(r => r.ok && setEmailPrefs(r.prefs));

    // Derived state
    const kycStatusValue = kycStatus?.status || profile?.kycStatus || "not_started";
    const hasForwardingAddress = Boolean(profile?.address);
    const planActive = subscription?.status === "active" || subscription?.plan?.status === "active";

    // Banners Component
    const Banners = () => {
        const banners = [];

        if (!hasForwardingAddress) {
            banners.push(
                <Banner
                    key="forwarding"
                    title="Set Up Forwarding Address"
                    message="Add your forwarding address to receive physical mail."
                    actionLabel="Add Address"
                    onAction={() => setActiveSection("forwarding")}
                />
            );
        }

        if (!planActive) {
            banners.push(
                <Banner
                    key="billing"
                    title="Subscription Issue"
                    message="Your plan needs attention. Update payment details."
                    actionLabel="Fix Billing"
                    onAction={() => setActiveSection("billing")}
                />
            );
        }

        return <>{banners}</>;
    };

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

    const openMail = async (id: string) => {
        // Toggle expansion
        if (expandedMailId === id) {
            setExpandedMailId(null);
            return;
        }

        try {
            // If we don't have details yet, fetch them
            if (!mailDetails[id]) {
                const response = await mailService.getMailItem(Number(id));
                if (response.ok && response.data) {
                    setMailDetails(prev => ({ ...prev, [id]: response.data }));
                    await mailService.updateMailItem(Number(id), { is_read: true });
                    loadMailItems();
                } else {
                    throw new Error("Mail not found");
                }
            }
            setExpandedMailId(id);
        } catch {
            toast({ title: "Error", description: "Failed to open mail.", variant: "destructive" });
        }
    };

    const downloadMailPdf = async (id: string) => {
        try {
            const response = await mailService.getScanUrl(Number(id));
            if (response.ok) {
                const urlToFetch = response.url;
                if (!urlToFetch) throw new Error("No download URL available");
                const blob = await fetch(urlToFetch).then(r => r.blob());
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `mail-${id}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast({ title: "Download", description: "Downloading scan…" });
            } else {
                throw new Error("No download URL available");
            }
        } catch {
            toast({ title: "Error", description: "Failed to download PDF.", variant: "destructive" });
        }
    };

    // KYC Management
    const startKyc = async () => {
        try {
            const response = await apiClient.startKyc();
            if (response.ok) {
                window.open(response.data.url, '_blank');
                toast({ title: "KYC Started", description: "Opening KYC verification..." });
            } else {
                throw new Error("Failed to start KYC");
            }
        } catch {
            toast({ title: "Error", description: "Failed to start KYC verification.", variant: "destructive" });
        }
    };

    // Forwarding Management
    const createForwardingRequest = async (mailItemId: string, destinationAddress: string) => {
        try {
            const response = await forwardingService.createForwardingRequest({
                letter_id: Number(mailItemId),
                to_name: 'User',
                address1: destinationAddress,
                city: '',
                postal: '',
                country: 'GB'
            });
            if (response.ok) {
                loadForwardingRequests();
                toast({ title: "Success", description: "Forwarding request created" });
            } else {
                throw new Error("Failed to create forwarding request");
            }
        } catch {
            toast({ title: "Error", description: "Failed to create forwarding request.", variant: "destructive" });
        }
    };

    // Billing Management
    const createPaymentRedirect = async (planId: string) => {
        try {
            const response = await billingService.createRedirectFlow();
            if (response.ok) {
                window.location.href = response.data.redirect_url;
            } else {
                throw new Error("Failed to create payment redirect");
            }
        } catch {
            toast({ title: "Error", description: "Failed to start payment process.", variant: "destructive" });
        }
    };

    const downloadInvoice = async (invoiceId: string) => {
        try {
            const response = await billingService.getInvoiceLink(Number(invoiceId));
            if (response.ok) {
                const urlToOpen = response.url;
                if (!urlToOpen) throw new Error("No invoice URL");
                window.open(urlToOpen, '_blank');
                toast({ title: "Download", description: "Opening invoice..." });
            } else {
                throw new Error("Failed to get invoice link");
            }
        } catch {
            toast({ title: "Error", description: "Failed to download invoice.", variant: "destructive" });
        }
    };

    // Support Ticket Management
    const createSupportTicket = async (subject: string, message: string) => {
        try {
            const response = await supportService.createTicket({ subject, message });
            if (response.ok) {
                refetchTickets();
                toast({ title: "Success", description: "Support ticket created" });
            } else {
                throw new Error("Failed to create support ticket");
            }
        } catch {
            toast({ title: "Error", description: "Failed to create support ticket.", variant: "destructive" });
        }
    };

    const closeSupportTicket = async (ticketId: string) => {
        try {
            const response = await supportService.closeTicket(Number(ticketId));
            if (response.ok) {
                refetchTickets();
                toast({ title: "Success", description: "Support ticket closed" });
            } else {
                throw new Error("Failed to close support ticket");
            }
        } catch {
            toast({ title: "Error", description: "Failed to close support ticket.", variant: "destructive" });
        }
    };

    // Email Preferences Management
    const updateEmailPrefs = async (preferences: any) => {
        try {
            const response = await emailPrefsService.updatePreferences(preferences);
            if (response.ok) {
                refetchEmailPrefs();
                toast({ title: "Success", description: "Email preferences updated" });
            } else {
                throw new Error("Failed to update email preferences");
            }
        } catch {
            toast({ title: "Error", description: "Failed to update email preferences.", variant: "destructive" });
        }
    };

    // Profile Management
    const updateProfile = async (profileData: any) => {
        try {
            const response = await profileService.updateProfile(profileData);
            if (response.ok) {
                refetchProfile();
                toast({ title: "Success", description: "Profile updated" });
            } else {
                throw new Error("Failed to update profile");
            }
        } catch {
            toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        }
    };

    // Render content based on active section
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
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
                if (mailLoading) return <SkeletonBlock label="Loading mail..." />;
                if (mailError) return <ErrorBlock label="Failed to load mail" detail={mailError} retry={loadMailItems} />;

                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">Inbox</h1>
                                {mailLoading && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Refreshing...</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    {mailItems.filter(item => !(item.isRead ?? item.is_read)).length} unread
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    {mailTotal} total
                                </Badge>
                            </div>
                        </div>

                        {mailItems.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                    <h3 className="text-lg font-medium mb-2">No mail yet</h3>
                                    <p className="text-muted-foreground">
                                        Your mail will appear here when it arrives at your virtual address.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-0">
                                    {/* Desktop Table */}
                                    <div className="hidden sm:block overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {mailItems.map((item) => (
                                                    <>
                                                        <TableRow
                                                            key={item.id}
                                                            className={`cursor-pointer hover:bg-muted/50 ${expandedMailId === item.id ? 'bg-muted/30' : ''}`}
                                                            onClick={() => openMail(item.id)}
                                                        >
                                                            <TableCell className="font-medium">
                                                                {item.description || "Mail Item"}
                                                            </TableCell>
                                                            <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {item.tag || "Other"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={!(item.isRead ?? item.is_read) ? "default" : "secondary"}
                                                                    className="text-xs"
                                                                >
                                                                    {(item.isRead ?? item.is_read) ? "read" : "unread"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => openMail(item.id)}
                                                                        className="h-7 px-2"
                                                                    >
                                                                        <Eye className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => downloadMailPdf(item.id)}
                                                                        className="h-7 px-2"
                                                                    >
                                                                        <Download className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                        {expandedMailId === item.id && mailDetails[item.id] && (
                                                            <TableRow key={`${item.id}-details`}>
                                                                <TableCell colSpan={5} className="bg-muted/20">
                                                                    <div className="p-4 space-y-4">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="space-y-2 flex-1">
                                                                                <h3 className="font-semibold">Mail Details</h3>
                                                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                                                    <div>
                                                                                        <span className="text-muted-foreground">Received:</span>
                                                                                        <p className="font-medium">{new Date(item.createdAt).toLocaleString()}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-muted-foreground">Type:</span>
                                                                                        <p className="font-medium">{item.tag || "Other"}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-muted-foreground">Status:</span>
                                                                                        <p className="font-medium capitalize">{(item.isRead ?? item.is_read) ? "read" : "unread"}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-muted-foreground">Description:</span>
                                                                                        <p className="font-medium">{item.description || "Mail Item"}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => downloadMailPdf(item.id)}
                                                                            >
                                                                                <Download className="h-4 w-4 mr-2" />
                                                                                Download PDF
                                                                            </Button>
                                                                        </div>

                                                                        {mailDetails[item.id].scanUrl && (
                                                                            <div className="border rounded-lg overflow-hidden bg-card">
                                                                                <div className="p-2 bg-muted/50 text-sm font-medium">
                                                                                    Mail Scan Preview
                                                                                </div>
                                                                                <div className="p-4 flex justify-center">
                                                                                    <img
                                                                                        src={mailDetails[item.id].scanUrl}
                                                                                        alt="Mail scan"
                                                                                        className="max-w-full h-auto max-h-96 rounded border"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {!mailDetails[item.id].scanUrl && (
                                                                            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                                                                <FileArchive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                                                <p>No scan preview available</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="sm:hidden space-y-3 p-4">
                                        {mailItems.map((item) => (
                                            <Card
                                                key={item.id}
                                                className={`border ${expandedMailId === item.id ? 'ring-2 ring-primary/20' : ''}`}
                                            >
                                                <CardContent className="p-4">
                                                    <div
                                                        className="cursor-pointer"
                                                        onClick={() => openMail(item.id)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className="font-medium text-sm break-words">
                                                                {item.description || "Mail Item"}
                                                            </h3>
                                                            <Badge
                                                                variant={!(item.isRead ?? item.is_read) ? "default" : "secondary"}
                                                                className="text-xs ml-2"
                                                            >
                                                                {(item.isRead ?? item.is_read) ? "read" : "unread"}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                                                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {item.tag || "Other"}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {expandedMailId === item.id && mailDetails[item.id] && (
                                                        <div className="mt-4 pt-4 border-t space-y-3">
                                                            <div className="space-y-2 text-sm">
                                                                <div>
                                                                    <span className="text-muted-foreground text-xs">Received:</span>
                                                                    <p className="font-medium">{new Date(item.createdAt).toLocaleString()}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground text-xs">Type:</span>
                                                                    <p className="font-medium">{item.tag || "Other"}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground text-xs">Status:</span>
                                                                    <p className="font-medium capitalize">{(item.isRead ?? item.is_read) ? "read" : "unread"}</p>
                                                                </div>
                                                            </div>

                                                            {mailDetails[item.id].scanUrl && (
                                                                <div className="border rounded-lg overflow-hidden bg-card">
                                                                    <div className="p-2 bg-muted/50 text-xs font-medium">
                                                                        Mail Scan Preview
                                                                    </div>
                                                                    <div className="p-3 flex justify-center">
                                                                        <img
                                                                            src={mailDetails[item.id].scanUrl}
                                                                            alt="Mail scan"
                                                                            className="max-w-full h-auto rounded border"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!mailDetails[item.id].scanUrl && (
                                                                <div className="border rounded-lg p-6 text-center text-muted-foreground">
                                                                    <FileArchive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                    <p className="text-xs">No scan preview available</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 mt-3">
                                                        <Button
                                                            size="sm"
                                                            variant={expandedMailId === item.id ? "default" : "outline"}
                                                            onClick={() => openMail(item.id)}
                                                            className="flex-1 h-8 text-xs"
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            {expandedMailId === item.id ? "Close" : "View"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => downloadMailPdf(item.id)}
                                                            className="flex-1 h-8 text-xs"
                                                        >
                                                            <Download className="h-3 w-3 mr-1" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Pagination Controls */}
                        {mailTotal > 20 && (
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {Math.min((mailPage - 1) * 20 + 1, mailTotal)}-{Math.min(mailPage * 20, mailTotal)} of {mailTotal}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMailPage(p => Math.max(1, p - 1))}
                                        disabled={mailPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMailPage(p => p + 1)}
                                        disabled={mailPage * 20 >= mailTotal}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "forwarding":
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">Forwarding</h1>
                            {forwardingLoading && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Refreshing...</span>
                                </div>
                            )}
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Mail Forwarding Requests ({forwardingTotal})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {forwardingLoading ? (
                                    <SkeletonBlock label="Loading forwarding requests..." />
                                ) : forwardingError ? (
                                    <ErrorBlock label="Failed to load forwarding requests" detail={forwardingError} retry={loadForwardingRequests} />
                                ) : forwardingRequests.length === 0 ? (
                                    <p className="text-muted-foreground">No forwarding requests found.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mail Item</TableHead>
                                                <TableHead>Destination</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(Array.isArray(forwardingRequests) ? forwardingRequests : []).map((request: any) => (
                                                <TableRow key={request.id}>
                                                    <TableCell>{request.mailItem?.description || 'Mail Item'}</TableCell>
                                                    <TableCell>{request.destinationAddress}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                                                            {request.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <Button size="sm" variant="outline">
                                                            View Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}

                                {/* Pagination Controls */}
                                {forwardingTotal > 20 && (
                                    <div className="flex items-center justify-between gap-4 mt-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {Math.min((forwardingPage - 1) * 20 + 1, forwardingTotal)}-{Math.min(forwardingPage * 20, forwardingTotal)} of {forwardingTotal}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setForwardingPage(p => Math.max(1, p - 1))}
                                                disabled={forwardingPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setForwardingPage(p => p + 1)}
                                                disabled={forwardingPage * 20 >= forwardingTotal}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Create Forwarding Request</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Select Mail Item</label>
                                        <select className="w-full p-2 border rounded">
                                            <option>Select a mail item to forward...</option>
                                            {(Array.isArray(mailItems) ? mailItems : []).map((item: any) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.description || 'Mail Item'} - {new Date(item.createdAt).toLocaleDateString()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Destination Address</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded"
                                            placeholder="Enter destination address..."
                                        />
                                    </div>
                                    <Button onClick={() => toast({ title: "Info", description: "Forwarding request creation form coming soon" })}>
                                        Create Request
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case "billing":
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">Billing</h1>
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Subscription</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <SkeletonBlock label="Loading subscription..." />
                                ) : error ? (
                                    <ErrorBlock label="Failed to load subscription" detail={error} retry={refetchSubscription} />
                                ) : subscription ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Plan:</span>
                                            <Badge variant="default">{subscription.plan?.name || 'Basic Plan'}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Status:</span>
                                            <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                                                {subscription.status || 'Inactive'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Next Billing:</span>
                                            <span>{subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <Button onClick={() => toast({ title: "Info", description: "Plan management coming soon" })}>
                                            Manage Plan
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">No active subscription found.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Available Plans</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {plans.length === 0 ? (
                                    <p className="text-muted-foreground">No plans available.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(Array.isArray(plans) ? plans : []).map((plan: any) => (
                                            <div key={plan.id} className="border rounded-lg p-4">
                                                <h3 className="font-semibold">{plan.name}</h3>
                                                <p className="text-2xl font-bold">£{plan.price}</p>
                                                <p className="text-sm text-muted-foreground">/{plan.interval}</p>
                                                <p className="text-sm mt-2">{plan.description}</p>
                                                <Button
                                                    className="w-full mt-4"
                                                    onClick={() => createPaymentRedirect(plan.id)}
                                                >
                                                    Select Plan
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Invoices ({invoicesTotal})</CardTitle>
                                    {invoicesLoading && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Refreshing...</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {invoicesLoading ? (
                                    <SkeletonBlock label="Loading invoices..." />
                                ) : invoicesError ? (
                                    <ErrorBlock label="Failed to load invoices" detail={invoicesError} retry={loadInvoices} />
                                ) : invoices.length === 0 ? (
                                    <p className="text-muted-foreground">No invoices found.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Invoice #</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(Array.isArray(invoices) ? invoices : []).map((invoice: any) => (
                                                <TableRow key={invoice.id}>
                                                    <TableCell>{invoice.invoiceNumber || invoice.id}</TableCell>
                                                    <TableCell>£{invoice.amount || '0.00'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                                                            {invoice.status || 'Pending'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => downloadInvoice(invoice.id)}
                                                        >
                                                            Download
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}

                                {/* Pagination Controls */}
                                {invoicesTotal > 20 && (
                                    <div className="flex items-center justify-between gap-4 mt-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {Math.min((invoicesPage - 1) * 20 + 1, invoicesTotal)}-{Math.min(invoicesPage * 20, invoicesTotal)} of {invoicesTotal}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setInvoicesPage(p => Math.max(1, p - 1))}
                                                disabled={invoicesPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setInvoicesPage(p => p + 1)}
                                                disabled={invoicesPage * 20 >= invoicesTotal}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );

            case "certificates":
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">Certificates</h1>
                        <Card>
                            <CardHeader>
                                <CardTitle>Available Certificates</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-muted-foreground">
                                        Download certificates and documents for your virtual address.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border rounded-lg p-4">
                                            <h3 className="font-semibold mb-2">Address Certificate</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Official certificate proving your virtual address
                                            </p>
                                            <Button
                                                variant="outline"
                                                onClick={() => toast({ title: "Info", description: "Certificate download coming soon" })}
                                            >
                                                <FileDown className="h-4 w-4 mr-2" />
                                                Download PDF
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg p-4">
                                            <h3 className="font-semibold mb-2">Business Certificate</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Certificate for business registration purposes
                                            </p>
                                            <Button
                                                variant="outline"
                                                onClick={() => toast({ title: "Info", description: "Business certificate download coming soon" })}
                                            >
                                                <FileDown className="h-4 w-4 mr-2" />
                                                Download PDF
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Mail Item Scans</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {mailItems.length === 0 ? (
                                    <p className="text-muted-foreground">No mail items available for download.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(Array.isArray(mailItems) ? mailItems : []).map((item: any) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.description || 'Mail Item'}</TableCell>
                                                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.isRead ? 'secondary' : 'default'}>
                                                            {item.isRead ? 'Scanned' : 'New'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => downloadMailPdf(item.id)}
                                                        >
                                                            <FileDown className="h-4 w-4 mr-1" />
                                                            Download Scan
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );

            case "kyc":
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">KYC Verification</h1>
                        <Card>
                            <CardHeader>
                                <CardTitle>KYC Verification Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <SkeletonBlock label="Loading KYC status..." />
                                ) : error ? (
                                    <ErrorBlock label="Failed to load KYC status" detail={error} retry={refetchKyc} />
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Status:</span>
                                            <Badge
                                                variant={
                                                    kycStatusValue === 'approved' ? 'default' :
                                                        kycStatusValue === 'pending' ? 'secondary' :
                                                            kycStatusValue === 'rejected' ? 'destructive' : 'outline'
                                                }
                                            >
                                                {kycStatusValue === 'not_started' ? 'Not Started' : kycStatusValue}
                                            </Badge>
                                        </div>

                                        {kycStatusValue === 'not_started' && (
                                            <div className="space-y-4">
                                                <p className="text-muted-foreground">
                                                    Complete your KYC verification to access all features and services.
                                                </p>
                                                <Button onClick={startKyc} className="w-full">
                                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                                    Start KYC Verification
                                                </Button>
                                            </div>
                                        )}

                                        {kycStatusValue === 'pending' && (
                                            <div className="space-y-4">
                                                <p className="text-muted-foreground">
                                                    Your KYC verification is being reviewed. This usually takes 1-2 business days.
                                                </p>
                                                <Button variant="outline" onClick={() => refetchKyc()}>
                                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                                    Check Status
                                                </Button>
                                            </div>
                                        )}

                                        {kycStatusValue === 'approved' && (
                                            <div className="space-y-4">
                                                <p className="text-green-600 font-medium">
                                                    ✅ Your identity has been verified successfully!
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    You now have access to all features and services.
                                                </p>
                                            </div>
                                        )}

                                        {kycStatusValue === 'rejected' && (
                                            <div className="space-y-4">
                                                <p className="text-red-600 font-medium">
                                                    ❌ Your KYC verification was rejected.
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Please contact support for assistance or try again.
                                                </p>
                                                <Button onClick={startKyc} variant="outline">
                                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                                    Try Again
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Required Documents</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                            <span className="text-xs">1</span>
                                        </div>
                                        <div>
                                            <p className="font-medium">Government ID</p>
                                            <p className="text-sm text-muted-foreground">Passport, driving license, or national ID</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                            <span className="text-xs">2</span>
                                        </div>
                                        <div>
                                            <p className="font-medium">Proof of Address</p>
                                            <p className="text-sm text-muted-foreground">Utility bill or bank statement (less than 3 months old)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                            <span className="text-xs">3</span>
                                        </div>
                                        <div>
                                            <p className="font-medium">Selfie Verification</p>
                                            <p className="text-sm text-muted-foreground">Take a selfie holding your ID document</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case "settings":
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">Settings</h1>
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Settings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full p-2 border rounded"
                                            value={profile?.email || ''}
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded"
                                            placeholder="Enter your full name..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="w-full p-2 border rounded"
                                            placeholder="Enter your phone number..."
                                        />
                                    </div>
                                    <Button onClick={() => toast({ title: "Info", description: "Profile update form coming soon" })}>
                                        Update Profile
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Email Preferences</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Mail Notifications</p>
                                            <p className="text-sm text-muted-foreground">Get notified when new mail arrives</p>
                                        </div>
                                        <input type="checkbox" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Forwarding Updates</p>
                                            <p className="text-sm text-muted-foreground">Get notified about forwarding status</p>
                                        </div>
                                        <input type="checkbox" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Billing Notifications</p>
                                            <p className="text-sm text-muted-foreground">Get notified about billing and payments</p>
                                        </div>
                                        <input type="checkbox" defaultChecked />
                                    </div>
                                    <Button onClick={() => toast({ title: "Info", description: "Email preferences update coming soon" })}>
                                        Save Preferences
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case "support":
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">Support</h1>
                        <Card>
                            <CardHeader>
                                <CardTitle>Support Tickets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {supportTickets.length === 0 ? (
                                    <p className="text-muted-foreground">No support tickets found.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(Array.isArray(supportTickets) ? supportTickets : []).map((ticket: any) => (
                                                <TableRow key={ticket.id}>
                                                    <TableCell>{ticket.subject}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={ticket.status === 'closed' ? 'secondary' : 'default'}>
                                                            {ticket.status || 'Open'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="outline">
                                                                View
                                                            </Button>
                                                            {ticket.status !== 'closed' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => closeSupportTicket(ticket.id)}
                                                                >
                                                                    Close
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Create Support Ticket</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Subject</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded"
                                            placeholder="Brief description of your issue..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Message</label>
                                        <textarea
                                            className="w-full p-2 border rounded h-24"
                                            placeholder="Please describe your issue in detail..."
                                        />
                                    </div>
                                    <Button onClick={() => toast({ title: "Info", description: "Support ticket creation form coming soon" })}>
                                        Create Ticket
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <SidebarProvider>
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
                                        <span className="ml-2 truncate">{item.label}</span>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop Sidebar */}
                    <Sidebar className="hidden lg:flex w-64 shrink-0">
                        <SidebarHeader className="p-6">
                            <div className="flex items-center gap-3">
                                <VAHLogo size="md" showText={false} />
                                <div>
                                    <h2 className="font-semibold">VirtualAddressHub</h2>
                                    <p className="text-sm text-muted-foreground">Dashboard</p>
                                </div>
                            </div>
                        </SidebarHeader>
                        <SidebarContent>
                            <SidebarMenu>
                                {menuItems.map((item) => (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            onClick={() => setActiveSection(item.id)}
                                            isActive={activeSection === item.id}
                                        >
                                            {item.icon}
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>

                            <div className="mt-auto p-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={onLogout}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </SidebarContent>
                    </Sidebar>

                    {/* Main Content */}
                    <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-hidden">
                        <Banners />
                        {renderContent()}
                    </div>
                </div>
            </SidebarProvider>
        </div>
    );
}