"use client";

import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
    useMailItems,
    useProfile,
    useSubscription,
    useSupportTickets,
    useRequestForwarding,
} from "../hooks/useApi";
import { mailApi } from "../services/api";
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
    LogOut,
    Eye,
    Download,
    Forward,
    Building,
    FileText,
    FileDown,
    FileArchive,
    HelpCircle,
    AlertTriangle,
    ShieldCheck,
    Loader2,
    Menu,
    X,
    User,
} from "lucide-react";

// Types
type MenuId =
    | "inbox"
    | "forwarding"
    | "billing"
    | "invoices"
    | "certificates"
    | "kyc"
    | "settings"
    | "support";

type KycStatus = "not_started" | "pending" | "approved" | "rejected";
type MailStatus = "unread" | "read" | "forwarded";
type MailTag = "HMRC" | "Companies House" | "Bank" | "Legal" | "Other";

// Component interfaces
interface UserDashboardProps {
    onLogout: () => void;
    onNavigate: (page: string) => void;
    onGoBack: () => void;
}

interface BannerProps {
    title: string;
    message: string;
    actionLabel: string;
    onAction: () => void;
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
    const [activeSection, setActiveSection] = useState<MenuId>("inbox");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // API hooks
    const {
        data: mailItems = [],
        loading: mailLoading,
        error: mailError,
        refetch: refetchMail,
    } = useMailItems();

    const {
        data: profile,
        loading: profileLoading,
        error: profileError,
        refetch: refetchProfile,
    } = useProfile();

    const {
        data: subscription,
        loading: subscriptionLoading,
        error: subscriptionError,
        refetch: refetchSubscription,
    } = useSubscription();

    const {
        data: supportTickets = [],
        loading: ticketsLoading,
        error: ticketsError,
        refetch: refetchTickets,
    } = useSupportTickets();

    const {
        mutate: requestForwarding,
        loading: forwardingLoading,
    } = useRequestForwarding();

    // Derived state
    const kycStatus: KycStatus = (profile?.kycStatus as KycStatus) || "not_started";
    const hasForwardingAddress = Boolean(profile?.address);
    const planActive = subscription?.data?.status === "active" || subscription?.data?.plan?.status === "active";

    // Menu items
    const menuItems: {
        id: MenuId;
        label: string;
        icon: JSX.Element;
    }[] = [
            { id: "inbox", label: "Inbox", icon: <Inbox className="h-4 w-4" /> },
            { id: "forwarding", label: "Forwarding", icon: <Truck className="h-4 w-4" /> },
            { id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" /> },
            { id: "invoices", label: "Invoices", icon: <FileText className="h-4 w-4" /> },
            { id: "certificates", label: "Certificates", icon: <FileDown className="h-4 w-4" /> },
            { id: "kyc", label: "KYC", icon: <ShieldCheck className="h-4 w-4" /> },
            { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
            { id: "support", label: "Support", icon: <HelpCircle className="h-4 w-4" /> },
        ];

    // Actions
    const openMail = async (id: string) => {
        try {
            const response = await mailApi.getMailItem(id);
            if (response?.success && response.data) {
                await mailApi.markAsRead(id);
                refetchMail();
                toast(`Opened "${response.data.description || "Mail"}".`);
            } else {
                throw new Error("Mail not found");
            }
        } catch {
            toast.error("Failed to open mail.");
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
            toast("Downloading scan…");
        } catch {
            toast.error("Failed to download PDF.");
        }
    };

    // Banners Component
    const Banners = () => {
        const banners = [];

        if (kycStatus === "not_started") {
            banners.push(
                <Banner
                    key="kyc"
                    title="Complete KYC Verification"
                    message="Identity verification required to use all features."
                    actionLabel="Start KYC"
                    onAction={() => setActiveSection("kyc")}
                />
            );
        }

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

    // Section Renderer
    const renderSection = () => {
        switch (activeSection) {
            case "inbox":
                if (mailLoading) return <SkeletonBlock label="Loading mail..." />;
                if (mailError) return <ErrorBlock label="Failed to load mail" detail={mailError.message} retry={refetchMail} />;

                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h1 className="text-2xl font-bold">Inbox</h1>
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    {mailItems.filter(item => item.status === "unread").length} unread
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    {mailItems.length} total
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
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-medium">
                                                            {item.description || "Mail Item"}
                                                        </TableCell>
                                                        <TableCell>{new Date(item.receivedDate).toLocaleDateString()}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">
                                                                {item.tag || "Other"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={item.status === "unread" ? "default" : "secondary"}
                                                                className="text-xs"
                                                            >
                                                                {item.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
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
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="sm:hidden space-y-3 p-4">
                                        {mailItems.map((item) => (
                                            <Card key={item.id} className="border">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-medium text-sm break-words">
                                                            {item.description || "Mail Item"}
                                                        </h3>
                                                        <Badge
                                                            variant={item.status === "unread" ? "default" : "secondary"}
                                                            className="text-xs ml-2"
                                                        >
                                                            {item.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                                                        <span>{new Date(item.receivedDate).toLocaleDateString()}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.tag || "Other"}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openMail(item.id)}
                                                            className="flex-1 h-8 text-xs"
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View
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
                    </div>
                );

            case "billing":
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">Billing</h1>
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Plan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <p className="font-medium">Digital Mailbox Plan</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <p className="text-2xl font-bold">£9.99</p>
                                                <span className="text-sm text-muted-foreground">/month</span>
                                                <Badge variant="default">active</Badge>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="w-full sm:w-auto">
                                            Change Plan
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold capitalize">{activeSection}</h1>
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">This section is under development.</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={onGoBack}
                                >
                                    Go Back
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                );
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
                        {renderSection()}
                    </div>
                </div>
            </SidebarProvider>
        </div>
    );
}
