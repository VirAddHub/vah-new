import { useState, useEffect } from "react";
import { useToast } from "./ui/use-toast";
import { useMailManager } from "../hooks/useMailManager";
import { mailApi } from "../lib/apiClient";
import {
  useProfile,
  useSubscription,
  useSupportTickets,
  useRequestForwarding,
} from "../hooks/useApi";
import { VAHLogo } from "./VAHLogo";
import type { MailItem } from "../types";
import MailCard from "./patterns/MailCard";

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
  | "settings" 
  | "support";

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

export function UserDashboard({ onLogout, onNavigate, onGoBack }: UserDashboardProps) {
  const [activeSection, setActiveSection] = useState<MenuId>("inbox");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [mailLoading, setMailLoading] = useState(true);
  const [mailError, setMailError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use the new mail manager hook
  const {
    expandedMailId,
    mailDetails,
    loadingId,
    downloadingId,
    errors,
    handleToggleMail,
    handleDownloadPdf,
  } = useMailManager(setMailItems);

  // Load mail items on mount
  useEffect(() => {
    const loadMailItems = async () => {
      setMailLoading(true);
      setMailError(null);
      try {
        const res = await mailApi.list();
        if (res.ok) {
          setMailItems(res.data);
        } else {
          setMailError(res.error);
        }
      } catch (error: any) {
        setMailError(error.message || 'Failed to load mail');
      } finally {
        setMailLoading(false);
      }
    };
    loadMailItems();
  }, []);

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
  const hasForwardingAddress = Boolean(profile?.forwarding_address);
  const planActive = subscription?.plan_status === "active";

  // Robust unread calculation - support multiple backends
  const unreadCount = mailItems.filter(
    (item) => {
      const byStatus = item.status ? item.status === "received" || item.status === "unread" : undefined;
      const byFlag = item.is_read;
      // If backend uses status, prefer it; otherwise treat falsy read flag as unread
      return byStatus ?? !Boolean(byFlag);
    }
  ).length;

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
      { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      { id: "support", label: "Support", icon: <HelpCircle className="h-4 w-4" /> },
    ];

  // Actions are now handled by useMailManager hook

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

  // Section Renderer
  const renderSection = () => {
    switch (activeSection) {
      case "inbox":
        if (mailLoading) return <SkeletonBlock label="Loading mail..." />;
        if (mailError) return <ErrorBlock label="Failed to load mail" detail={mailError} retry={refetchMail} />;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">Inbox</h1>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} unread
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {mailItems?.length || 0} total
                </Badge>
              </div>
            </div>

            {!mailItems || mailItems.length === 0 ? (
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
              <>
                {/* Mobile Cards */}
                <div className="space-y-3 sm:hidden">
                  {mailItems.map(item => (
                    <MailCard
                      key={item.id}
                      item={item}
                      isExpanded={expandedMailId === item.id}
                      isLoading={loadingId === item.id}
                      isDownloading={downloadingId === item.id}
                      details={mailDetails[item.id]}
                      error={errors[item.id] ?? null}
                      onToggle={handleToggleMail}
                      onDownload={handleDownloadPdf}
                    />
                  ))}
                </div>

                {/* Desktop Table */}
                <Card className="hidden sm:block">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
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
                          {(mailItems || []).map((item) => (
                            <>
                              <TableRow
                                key={item.id}
                                className={`cursor-pointer hover:bg-muted/50 ${expandedMailId === item.id ? 'bg-muted/30' : ''}`}
                                onClick={() => handleToggleMail(item)}
                              >
                                <TableCell className="font-medium">
                                  {item.subject || "Mail Item"}
                                </TableCell>
                                <TableCell>{new Date(item.received_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {item.tag || "Mail"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={item.status === "received" || item.status === "unread" ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleToggleMail(item)}
                                      className="h-7 px-2"
                                      disabled={loadingId === item.id}
                                    >
                                      {loadingId === item.id ? <Eye className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDownloadPdf(item.id)}
                                      className="h-7 px-2"
                                      disabled={downloadingId === item.id}
                                    >
                                      {downloadingId === item.id ? <Download className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
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
                                              <p className="font-medium">{new Date(item.received_at).toLocaleString()}</p>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Type:</span>
                                              <p className="font-medium">{item.tag || "Other"}</p>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Status:</span>
                                              <p className="font-medium capitalize">{item.status}</p>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Sender:</span>
                                              <p className="font-medium">{item.sender_name || "Unknown"}</p>
                                            </div>
                                          </div>
                                          {mailDetails[item.id]?.notes && (
                                            <div className="mt-3">
                                              <span className="text-muted-foreground">Notes:</span>
                                              <p className="font-medium">{mailDetails[item.id].notes}</p>
                                            </div>
                                          )}
                                          {errors[item.id] && (
                                            <div className="mt-3">
                                              <p className="text-destructive text-sm">{errors[item.id]}</p>
                                            </div>
                                          )}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDownloadPdf(item.id)}
                                          disabled={downloadingId === item.id}
                                        >
                                          {downloadingId === item.id ? <Download className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                          Download PDF
                                        </Button>
                                      </div>

                                      {mailDetails[item.id].scan_url && (
                                        <div className="border rounded-lg overflow-hidden bg-card">
                                          <div className="p-2 bg-muted/50 text-sm font-medium">
                                            Mail Scan Preview
                                          </div>
                                          <div className="p-4 flex justify-center">
                                            <img
                                              src={mailDetails[item.id].scan_url}
                                              alt="Mail scan"
                                              className="max-w-full h-auto max-h-96 rounded border"
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {!mailDetails[item.id].scan_url && (
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
                  </CardContent>
                </Card>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-3">
                  {(mailItems || []).map((item) => (
                    <Card
                      key={item.id}
                      className={`border ${expandedMailId === item.id ? 'ring-2 ring-primary/20 bg-muted/30' : ''}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Header - Always Visible */}
                        <div
                          className="cursor-pointer active:opacity-70 transition-opacity"
                          onClick={() => openMail(item.id)}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="font-medium flex-1 break-words pr-2">
                              {item.description || "Mail Item"}
                            </h3>
                            <Badge
                              variant={item.status === "received" ? "default" : "secondary"}
                              className="shrink-0"
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-muted-foreground">
                            <span className="text-sm">
                              {new Date(item.received_at).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className="shrink-0">
                              {item.subject || "Other"}
                            </Badge>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedMailId === item.id && mailDetails[item.id] && (
                          <div className="pt-3 border-t space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Received</p>
                                <p className="text-sm font-medium">
                                  {new Date(item.received_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Type</p>
                                <p className="text-sm font-medium">{item.subject || "Other"}</p>
                              </div>
                            </div>

                            {mailDetails[item.id].scanUrl && (
                              <div className="border rounded-lg overflow-hidden bg-background">
                                <div className="px-3 py-2 bg-muted/50 text-xs font-medium">
                                  Mail Scan Preview
                                </div>
                                <div className="p-3">
                                  <img
                                    src={mailDetails[item.id].scanUrl}
                                    alt="Mail scan"
                                    className="w-full h-auto rounded border"
                                  />
                                </div>
                              </div>
                            )}

                            {!mailDetails[item.id].scanUrl && (
                              <div className="border rounded-lg p-6 text-center text-muted-foreground bg-muted/20">
                                <FileArchive className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No scan preview available</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="default"
                            variant={expandedMailId === item.id ? "default" : "outline"}
                            onClick={() => openMail(item.id)}
                            className="flex-1 h-10"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {expandedMailId === item.id ? "Close" : "View"}
                          </Button>
                          <Button
                            size="default"
                            variant="outline"
                            onClick={() => downloadMailPdf(item.id)}
                            className="flex-1 h-10"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
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
}