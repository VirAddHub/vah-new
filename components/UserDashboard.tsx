import { useMemo, useState } from "react";
import {
    useMailItems,
    useProfile,
    useSubscription,
    useSupportTickets,
    useRequestForwarding,
} from "../hooks/useApi";
import { mailApi } from "../services/api";

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
    LogOut,
    Eye,
    Download,
    Forward,
    Building,
    FileText,
    FileDown,
    FileArchive,
    HelpCircle,
    Bell,
    ShieldCheck,
    AlertTriangle,
} from "lucide-react";

import { useToast } from "./ui/use-toast"; // shadcn toast hook (assumes toaster mounted at app root)

interface UserDashboardProps {
    onLogout: () => void;
    onNavigate?: (page: string) => void;
    onGoBack?: () => void;
}

type MailTag = "HMRC" | "Companies House" | "Other";
type MailStatus = "received" | "scanned" | "forwarded" | "deleted";
type KycStatus = "pending" | "verified" | "rejected" | "not_started";

type MenuId =
    | "inbox"
    | "forwarding"
    | "billing"
    | "invoices"
    | "certificates"
    | "kyc"
    | "support"
    | "settings";

export function UserDashboard({ onLogout }: UserDashboardProps) {
    const { toast } = useToast();

    const [activeSection, setActiveSection] = useState<MenuId>("inbox");

    // API hooks
    const {
        data: mailItems,
        loading: mailLoading,
        error: mailError,
        refetch: refetchMail,
    } = useMailItems();

    const { data: profile, loading: profileLoading } = useProfile();
    const {
        data: subscription,
        loading: subscriptionLoading,
        error: subscriptionError,
    } = useSubscription();

    const {
        data: supportTickets,
        loading: ticketsLoading,
        error: ticketsError,
    } = useSupportTickets();

    const {
        mutate: requestForwarding,
        loading: forwardingLoading,
    } = useRequestForwarding();

    // Derived/user status
    const kycStatus: KycStatus =
        (profile?.kycStatus as KycStatus) || "not_started";

    const hasForwardingAddress = Boolean(profile?.address);
    const planActive =
        subscription?.data?.status === "active" ||
        subscription?.data?.plan?.status === "active";

    // IA: sidebar
    const menuItems: { id: MenuId; label: string; icon: JSX.Element }[] = [
        { id: "inbox", label: "Inbox", icon: <Inbox className="h-4 w-4" /> },
        { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
        { id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> },
        { id: "invoices", label: "Invoices", icon: <FileText className="h-4 w-4" /> },
        { id: "certificates", label: "Certificates", icon: <FileDown className="h-4 w-4" /> },
        { id: "kyc", label: "KYC", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "support", label: "Support", icon: <HelpCircle className="h-4 w-4" /> },
        { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ];

    // Fallback demo data if API is loading/empty
    const demoMailItems: Array<{
        id: string;
        receivedDate: string;
        senderName: string;
        description: string;
        category: MailTag;
        status: MailStatus;
    }> = [
            {
                id: "demo_1",
                receivedDate: "2025-02-15",
                senderName: "HMRC",
                description: "Annual Return Notice",
                category: "HMRC",
                status: "received",
            },
            {
                id: "demo_2",
                receivedDate: "2025-02-14",
                senderName: "Companies House",
                description: "Confirmation Statement Due",
                category: "Companies House",
                status: "scanned",
            },
        ];

    const invoices = [
        { id: "INV-0021", date: "2025-02-01", amount: "£9.99", status: "Paid" },
        { id: "INV-0020", date: "2025-01-01", amount: "£12.99", status: "Paid" },
    ];

    // Helpers
    const isGovMail = (tag: MailTag) =>
        tag === "HMRC" || tag === "Companies House";

    const ageInDays = (isoDate: string) => {
        const d = new Date(isoDate);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const canForwardItem = (item: { receivedDate: string }) => {
        // Enforce 14-day window as per product rules
        return ageInDays(item.receivedDate) <= 14;
    };

    // --- Actions ---
    const openMail = async (id: string) => {
        try {
            const response = await mailApi.getMailItem(id);
            if (response?.success && response.data) {
                await mailApi.markAsRead(id);
                refetchMail();
                toast({ description: `Opened "${response.data.description || "Mail"}".` });
            } else {
                throw new Error("Mail not found");
            }
        } catch {
            toast({ variant: "destructive", description: "Failed to open mail." });
        }
    };

    const downloadMailPdf = async (id: string) => {
        try {
            const blob = await mailApi.downloadScan(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mail-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ description: "Downloading scan…" });
        } catch {
            toast({ variant: "destructive", description: "Failed to download PDF." });
        }
    };

    const requestForward = async (item: {
        id: string;
        category: MailTag;
        receivedDate: string;
    }) => {
        if (!hasForwardingAddress) {
            toast({
                variant: "destructive",
                description: "Add your forwarding address in Settings first.",
            });
            return;
        }
        if (!canForwardItem(item)) {
            toast({
                variant: "destructive",
                description: "Forwarding is only available for the last 14 days.",
            });
            return;
        }
        try {
            const govt = isGovMail(item.category);
            await requestForwarding({
                mailId: item.id,
                address: profile!.address,
                notes: govt ? "Government mail (free)" : "Standard mail (£2 handling)",
            });
            refetchMail();
            toast({
                description: govt
                    ? "Forward request submitted — free for government mail."
                    : "Forward request submitted — £2 will be added to your bill.",
            });
        } catch {
            toast({ variant: "destructive", description: "Failed to request forwarding." });
        }
    };

    const downloadCertificate = async () => {
        // Wire later: GET /api/profile/certificate (or /certificate-url)
        toast({ description: "Preparing certificate download…" });
    };

    const downloadInvoicePdf = async (id: string) => {
        // Wire later: GET /api/billing/invoices/:id/link -> /api/invoices/:token
        toast({ description: `Fetching invoice ${id}…` });
    };

    const switchPlan = (plan: "monthly-9.99" | "annual-89.99") => {
        // Wire later: POST /api/billing/switch
        toast({ description: `Switching to ${plan.replace("-", " £")}` });
    };

    const cancelPlan = () => {
        // Wire later: POST /api/billing/cancel
        toast({ description: "Cancelling plan…" });
    };

    const startKyc = () => {
        // Wire later: POST /api/kyc/start + GET /api/kyc/token (Sumsub)
        toast({ description: "Starting verification…" });
    };

    const requestGdprExport = () => {
        // Wire later: POST /api/gdpr/export
        toast({ description: "GDPR export requested." });
    };

    const updateNotifPrefs = () => {
        // Wire later: GET/PATCH /api/notifications/prefs
        toast({ description: "Opening notification preferences…" });
    };

    // --- Banners (guards) ---
    const Banners = () => {
        const banners = [];

        if (kycStatus !== "verified") {
            banners.push(
                <AlertBanner
                    key="kyc"
                    title="KYC verification required"
                    message="Please complete identity verification to unlock forwarding and certificates."
                    actionLabel="Verify now"
                    onAction={() => setActiveSection("kyc")}
                />
            );
        }

        if (!planActive && !subscriptionLoading && !subscriptionError) {
            banners.push(
                <AlertBanner
                    key="billing"
                    title="Payment issue"
                    message="Your subscription isn't active. Please check your Direct Debit to continue service."
                    actionLabel="Go to billing"
                    onAction={() => setActiveSection("billing")}
                    variant="warning"
                />
            );
        }

        if (!hasForwardingAddress) {
            banners.push(
                <AlertBanner
                    key="addr"
                    title="Add a forwarding address"
                    message="Set your preferred delivery address to request physical forwarding."
                    actionLabel="Add address"
                    onAction={() => setActiveSection("settings")}
                />
            );
        }

        return banners.length ? <div className="space-y-2 mb-6">{banners}</div> : null;
    };

    // --- Sections ---
    const renderInbox = () => {
        const displayMailItems =
            (mailItems?.data as any[]) && (mailItems!.data as any[]).length > 0
                ? (mailItems!.data as any[])
                : demoMailItems;

        const newCount = displayMailItems.filter((m) => m.status === "received").length;

        if (mailLoading) return <SkeletonBlock label="Loading mail…" />;

        if (mailError) {
            return (
                <ErrorBlock
                    label="Error loading mail"
                    detail={String(mailError)}
                    retry={refetchMail}
                />
            );
        }

        return (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h1>Mail Inbox</h1>
                    <Badge variant="secondary">{newCount} new</Badge>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Sender</TableHead>
                                <TableHead>Subject / Tag</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayMailItems.map((m: any) => {
                                const canForward = canForwardItem(m);
                                const gov = isGovMail(m.category);
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell>{new Date(m.receivedDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{m.senderName || "Unknown"}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div>{m.description || "No description"}</div>
                                                <Badge
                                                    className="mt-1"
                                                    variant={gov ? "default" : "secondary"}
                                                >
                                                    {m.category}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusPill
                                                status={m.status as MailStatus}
                                                labels={{ received: "new", scanned: "scanned", forwarded: "forwarded", deleted: "deleted" }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openMail(m.id)}
                                                    disabled={mailLoading}
                                                    aria-label="Open mail"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => downloadMailPdf(m.id)}
                                                    disabled={mailLoading}
                                                    aria-label="Download scan"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => requestForward(m)}
                                                    disabled={forwardingLoading || !hasForwardingAddress || !canForward}
                                                    title={
                                                        !hasForwardingAddress
                                                            ? "Add a forwarding address first"
                                                            : !canForward
                                                                ? "Forwarding is limited to the last 14 days"
                                                                : gov
                                                                    ? "Government mail forwarding is free"
                                                                    : "£2 handling applies"
                                                    }
                                                    aria-label="Request forwarding"
                                                >
                                                    <Forward className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>

                <p className="text-xs text-muted-foreground mt-3">
                    HMRC & Companies House forwarding: free. All other UK letters: £2 handling (postage at cost), billed with your subscription.
                </p>
            </div>
        );
    };

    const renderForwarding = () => (
        <div>
            <h1 className="mb-6">Mail Forwarding</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Request Physical Forwarding</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <p>• HMRC mail: <b>Always free</b></p>
                        <p>• Companies House mail: <b>Always free</b></p>
                        <p>• Other mail: <b>£2 per item</b> (postage at cost)</p>
                        <p className="text-muted-foreground">Forwarding available for items received within the last 14 days.</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                        Open your Inbox and click <b>Forward</b> on an item.
                    </p>
                </CardContent>
            </Card>
        </div>
    );

    const renderBilling = () => {
        if (subscriptionLoading) return <SkeletonBlock label="Loading subscription…" />;

        const currentPlan = subscription?.data?.plan;
        const planPrice = currentPlan ? (currentPlan.price / 100).toFixed(2) : "9.99";
        const planInterval = currentPlan?.interval || "month";
        const status = subscription?.data?.status || currentPlan?.status || "active";

        return (
            <div>
                <h1 className="mb-6">Billing & Subscription</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p>{currentPlan?.name || "Digital Mailbox Plan"}</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl">£{planPrice}</p>
                                    <span className="text-sm text-muted-foreground">/{planInterval}</span>
                                    <Badge variant={status === "active" ? "default" : "destructive"}>{status}</Badge>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <Button variant="outline" onClick={() => switchPlan("annual-89.99")}>
                                        Switch to Annual (£89.99)
                                    </Button>
                                    <Button variant="outline" onClick={cancelPlan}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Forwarding Charges</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {/* Replace with GET /api/billing (usage) if available */}
                                <p>This month: £4.00</p>
                                <p className="text-sm text-muted-foreground">2 items forwarded</p>
                                <p className="text-sm text-muted-foreground">Government mail forwarding is always free</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6">
                    <Button variant="outline" onClick={() => setActiveSection("invoices")}>
                        View Invoices
                    </Button>
                </div>
            </div>
        );
    };

    const renderInvoices = () => (
        <div>
            <h1 className="mb-6">Invoices</h1>
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((inv) => (
                            <TableRow key={inv.id}>
                                <TableCell>{inv.id}</TableCell>
                                <TableCell>{inv.date}</TableCell>
                                <TableCell>{inv.amount}</TableCell>
                                <TableCell>
                                    <Badge variant="default">{inv.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => downloadInvoicePdf(inv.id)}
                                        aria-label={`Download invoice ${inv.id}`}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );

    const renderCertificates = () => (
        <div>
            <h1 className="mb-6">Certificates</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Proof of Address Certificate</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Download an official certificate confirming your London business address.
                    </p>
                    <Button onClick={downloadCertificate}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Download Certificate (PDF)
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    const renderKyc = () => (
        <div>
            <h1 className="mb-6">KYC Verification</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                        <Badge
                            variant={
                                kycStatus === "verified"
                                    ? "default"
                                    : kycStatus === "rejected"
                                        ? "destructive"
                                        : "secondary"
                            }
                        >
                            {kycStatus}
                        </Badge>
                        {kycStatus !== "verified" && (
                            <Button variant="outline" onClick={startKyc}>
                                Start / Resume Verification
                            </Button>
                        )}
                    </div>
                    <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">
                            Identity verification keeps your personal address private and your business compliant.
                        </div>
                    </div>
                    {kycStatus === "verified" && (
                        <div className="mt-4">
                            <Button variant="outline" onClick={downloadCertificate}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Download Proof of Address
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    const renderSupport = () => (
        <div>
            <h1 className="mb-6">Support</h1>
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Tickets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ticketsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-muted-foreground">
                                            Loading tickets…
                                        </TableCell>
                                    </TableRow>
                                ) : ticketsError ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-destructive">
                                            Error loading tickets
                                        </TableCell>
                                    </TableRow>
                                ) : supportTickets?.data?.length ? (
                                    supportTickets.data.map((ticket: any) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell>{ticket.id}</TableCell>
                                            <TableCell>{ticket.subject}</TableCell>
                                            <TableCell>
                                                <Badge variant={ticket.status === "open" ? "secondary" : "default"}>
                                                    {ticket.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(ticket.updatedAt).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No support tickets
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="mt-4">
                            <Button variant="outline" onClick={() => toast({ description: "Open new ticket…" })}>
                                Open new ticket
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground mb-3">
                            Choose what we email you about.
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={updateNotifPrefs}>
                                <Bell className="h-4 w-4 mr-2" /> Update preferences
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => toast({ description: "Previewing emails…" })}
                            >
                                Preview
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div>
            <h1 className="mb-6">Account Settings</h1>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-3">
                            Update your email and password. Name and business details may be locked once KYC is approved.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => toast({ description: "Edit profile…" })}
                        >
                            Edit Profile
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Forwarding Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-3">
                            Set your delivery address for physical forwarding requests.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => toast({ description: "Update forwarding address…" })}
                        >
                            Update Address
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Privacy & Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={requestGdprExport}>
                                <FileArchive className="h-4 w-4 mr-2" /> Request GDPR Export
                            </Button>
                            <Button variant="outline" onClick={downloadCertificate}>
                                <FileDown className="h-4 w-4 mr-2" /> Download Address Certificate
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-3">
                            Permanently delete your account and data.
                        </p>
                        <Button
                            variant="destructive"
                            onClick={() => toast({ description: "Delete account…" })}
                        >
                            Delete Account
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case "inbox":
                return renderInbox();
            case "forwarding":
                return renderForwarding();
            case "billing":
                return renderBilling();
            case "invoices":
                return renderInvoices();
            case "certificates":
                return renderCertificates();
            case "kyc":
                return renderKyc();
            case "support":
                return renderSupport();
            case "settings":
                return renderSettings();
            default:
                return <div className="text-muted-foreground">Select a section from the sidebar</div>;
        }
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen">
                <Sidebar>
                    <SidebarHeader>
                        <div className="flex items-center gap-2 px-4 py-2">
                            <Building className="h-6 w-6 text-primary" />
                            <span>VirtualAddressHub</span>
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
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={onLogout}>
                                    <LogOut className="h-4 w-4" />
                                    <span>Sign out</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarContent>
                </Sidebar>

                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-6xl mx-auto">
                        <Banners />
                        {renderContent()}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}

/* ---------- Small UI helpers ---------- */

function SkeletonBlock({ label }: { label: string }) {
    return (
        <div className="p-6 space-y-3">
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            <div className="h-24 w-full bg-muted animate-pulse rounded" />
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}

function ErrorBlock({
    label,
    detail,
    retry,
}: {
    label: string;
    detail?: string;
    retry?: () => void;
}) {
    return (
        <div className="p-6 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="font-medium">{label}</p>
            </div>
            {detail && (
                <p className="text-sm text-muted-foreground mt-2 break-all">{detail}</p>
            )}
            {retry && (
                <Button variant="outline" className="mt-3" onClick={retry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

function StatusPill({
    status,
    labels = { received: "new", scanned: "scanned", forwarded: "forwarded", deleted: "deleted" },
}: {
    status: MailStatus;
    labels?: Partial<Record<MailStatus, string>> & Record<string, string>;
}) {
    const variant =
        status === "received"
            ? "destructive"
            : status === "forwarded"
                ? "secondary"
                : status === "deleted"
                    ? "outline"
                    : "default";
    return <Badge variant={variant as any}>{labels[status] || status}</Badge>;
}

function AlertBanner({
    title,
    message,
    actionLabel,
    onAction,
    variant = "default",
}: {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: "default" | "warning";
}) {
    return (
        <div
            className={`w-full rounded-lg border p-4 ${variant === "warning" ? "border-amber-300 bg-amber-50" : "border-border bg-card"
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                {actionLabel && onAction && (
                    <Button variant="outline" size="sm" onClick={onAction}>
                        {actionLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}
