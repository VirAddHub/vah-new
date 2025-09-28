"use client";

import { useToast } from "./ui/use-toast";
import { useMemo, useState, useEffect } from "react";
import { apiClient, safe } from "../lib/apiClient";
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
    const [forwardingRequests, setForwardingRequests] = useState<any[]>([]);
    const [billing, setBilling] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [kycStatus, setKycStatus] = useState<any>(null);
    const [emailPrefs, setEmailPrefs] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [
                    mailResponse,
                    profileResponse,
                    subscriptionResponse,
                    ticketsResponse,
                    forwardingResponse,
                    billingResponse,
                    invoicesResponse,
                    plansResponse,
                    kycResponse,
                    emailPrefsResponse
                ] = await Promise.all([
                    apiClient.get('/api/mail-items'),
                    apiClient.get('/api/profile'),
                    apiClient.get('/api/payments/subscriptions/status'),
                    apiClient.get('/api/support/tickets'),
                    apiClient.get('/api/forwarding-requests'),
                    apiClient.get('/api/billing'),
                    apiClient.get('/api/billing/invoices'),
                    apiClient.get('/api/plans'),
                    apiClient.get('/api/kyc/status'),
                    apiClient.get('/api/email-prefs')
                ]);

                // Handle data with correct shapes using safe helper
                if (mailResponse.ok) {
                    const mailData = mailResponse.data as { items?: any[] };
                    setMailItems(safe(mailData?.items, []));
                }
                if (profileResponse.ok) {
                    const profileData = profileResponse.data as { user?: any };
                    setProfile(safe(profileData?.user, profileResponse.data));
                }
                if (subscriptionResponse.ok) {
                    const subData = subscriptionResponse.data as { subscription?: any };
                    setSubscription(safe(subData?.subscription, subscriptionResponse.data));
                }
                if (ticketsResponse.ok) {
                    const ticketsData = ticketsResponse.data as { items?: any[] };
                    setSupportTickets(safe(ticketsData?.items, []));
                }
                if (forwardingResponse.ok) {
                    const forwardingData = forwardingResponse.data as { items?: any[] };
                    setForwardingRequests(safe(forwardingData?.items, []));
                }
                if (billingResponse.ok) {
                    const billingData = billingResponse.data as { subscription?: any };
                    setBilling(safe(billingData?.subscription, billingResponse.data));
                }
                if (invoicesResponse.ok) {
                    const invoicesData = invoicesResponse.data as { items?: any[] };
                    setInvoices(safe(invoicesData?.items, []));
                }
                if (plansResponse.ok) {
                    const plansData = plansResponse.data as { items?: any[] };
                    setPlans(safe(plansData?.items, []));
                }
                if (kycResponse.ok) setKycStatus(kycResponse.data as any);
                if (emailPrefsResponse.ok) setEmailPrefs(emailPrefsResponse.data);
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
    const refetchMail = () => apiClient.get('/api/mail-items').then(r => r.ok && setMailItems(safe(r.data?.items, [])));
    const refetchProfile = () => apiClient.get('/api/profile').then(r => r.ok && setProfile(safe(r.data?.user, r.data)));
    const refetchSubscription = () => apiClient.get('/api/payments/subscriptions/status').then(r => r.ok && setSubscription(safe(r.data?.subscription, r.data)));
    const refetchTickets = () => apiClient.get('/api/support/tickets').then(r => r.ok && setSupportTickets(safe(r.data?.items, [])));
    const refetchForwarding = () => apiClient.get('/api/forwarding-requests').then(r => r.ok && setForwardingRequests(safe(r.data?.items, [])));
    const refetchBilling = () => apiClient.get('/api/billing').then(r => r.ok && setBilling(safe(r.data?.subscription, r.data)));
    const refetchInvoices = () => apiClient.get('/api/billing/invoices').then(r => r.ok && setInvoices(safe(r.data?.items, [])));
    const refetchPlans = () => apiClient.get('/api/plans').then(r => r.ok && setPlans(safe(r.data?.items, [])));
    const refetchKyc = () => apiClient.get('/api/kyc/status').then(r => r.ok && setKycStatus(r.data));
    const refetchEmailPrefs = () => apiClient.get('/api/email-prefs').then(r => r.ok && setEmailPrefs(r.data));

    // Derived state
    const kycStatusValue = kycStatus?.status || profile?.kycStatus || "not_started";
    const hasForwardingAddress = Boolean(profile?.address);
    const planActive = subscription?.status === "active" || subscription?.plan?.status === "active";

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
        refetchForwarding();
        refetchBilling();
        refetchInvoices();
        refetchPlans();
        refetchKyc();
        refetchEmailPrefs();
        toast({ title: "Success", description: "Dashboard refreshed" });
    };

    const openMail = async (id: string) => {
        try {
            const response = await apiClient.get(`/api/mail-items/${id}`);
            if (response.ok) {
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
            if (response.ok) {
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

    // KYC Management
    const startKyc = async () => {
        try {
            const response = await apiClient.post('/api/kyc/start');
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
            const response = await apiClient.post('/api/forwarding-requests', {
                mailItemId,
                destinationAddress
            });
            if (response.ok) {
                refetchForwarding();
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
            const response = await apiClient.post('/api/payments/redirect-flows', { planId });
            if (response.ok) {
                window.location.href = response.data.url;
            } else {
                throw new Error("Failed to create payment redirect");
            }
        } catch {
            toast({ title: "Error", description: "Failed to start payment process.", variant: "destructive" });
        }
    };

    const downloadInvoice = async (invoiceId: string) => {
        try {
            const response = await apiClient.get(`/api/billing/invoices/${invoiceId}/link`);
            if (response.ok) {
                window.open(response.data.url, '_blank');
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
            const response = await apiClient.post('/api/support/tickets', { subject, message });
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
            const response = await apiClient.post(`/api/support/tickets/${ticketId}/close`);
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
            const response = await apiClient.patch('/api/email-prefs', preferences);
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
            const response = await apiClient.patch('/api/profile', profileData);
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
                                        {(Array.isArray(mailItems) ? mailItems : []).map((item: any) => (
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
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Mail Forwarding Requests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {forwardingRequests.length === 0 ? (
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
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Subscription</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {subscription ? (
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
                                <CardTitle>Invoices</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {invoices.length === 0 ? (
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
                            </CardContent>
                        </Card>
                    </div>
                );

            case "certificates":
                return (
                    <div className="space-y-6">
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
                        <Card>
                            <CardHeader>
                                <CardTitle>KYC Verification Status</CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                                <RefreshCw className="h-4 w-4 mr-2" />
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
            <div className="flex flex-col lg:flex-row">
                {/* Mobile Header */}
                <div className="lg:hidden bg-card border-b border-border p-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => onNavigate?.('home')}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                            <VAHLogo size="sm" showText={false} />
                            <div>
                                <h2 className="font-semibold text-sm">VirtualAddressHub</h2>
                                <p className="text-xs text-muted-foreground">Dashboard</p>
                            </div>
                        </button>
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
                        <button
                            onClick={() => onNavigate?.('home')}
                            className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity"
                        >
                            <VAHLogo size="sm" showText={false} />
                            <div>
                                <h2 className="font-semibold text-sm">VirtualAddressHub</h2>
                                <p className="text-xs text-muted-foreground">Dashboard</p>
                            </div>
                        </button>
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