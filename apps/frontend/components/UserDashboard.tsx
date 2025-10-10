"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from 'swr';
import {
  Building2,
  FileCheck,
  Download,
  Truck,
  CheckSquare,
  Square,
  Mail,
  AlertCircle,
  Eye,
  Calendar,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Settings,
  User,
  Bell,
  CreditCard,
  HelpCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { openInline, downloadFile } from "@/lib/fileActions";
import PDFViewerModal from "@/components/PDFViewerModal";
import { ForwardingConfirmationModal } from "./ForwardingConfirmationModal";
import { VAHLogo } from "./VAHLogo";
import { useToast } from "./ui/use-toast";

interface UserDashboardProps {
  onLogout: () => void;
  onNavigate: (page: string, data?: any) => void;
  onGoBack?: () => void;
}

// API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

// Token helper
const getToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('vah_jwt') || '';
};

// SWR fetcher function
const fetcher = (url: string) => {
  const token = getToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE}${url}`, {
    headers,
    credentials: 'include'
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};

// Mail item interface
interface MailItem {
  id: string | number;
  subject?: string;
  sender_name?: string;
  received_date?: string;
  received_at?: string;
  status?: string;
  tag?: string;
  is_read?: boolean;
  created_at?: string;
  file_url?: string;
  gdpr_expired?: boolean;
}

export function UserDashboard({ onLogout, onNavigate, onGoBack }: UserDashboardProps) {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState<string[]>([]);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedMailForPDF, setSelectedMailForPDF] = useState<MailItem | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [showForwardingConfirmation, setShowForwardingConfirmation] = useState(false);
  const [selectedMailForForwarding, setSelectedMailForForwarding] = useState<MailItem | null>(null);

  // SWR hook for mail items with optimized polling
  const { data: mailData, error: mailError, isLoading: mailLoading, mutate: refreshMail } = useSWR(
    '/api/mail-items',
    fetcher,
    {
      refreshInterval: 60000, // Reduced from 15s to 60s
      revalidateOnFocus: false, // Disable focus revalidation
      revalidateOnReconnect: true,
      errorRetryCount: 2, // Reduced retry count
      errorRetryInterval: 10000, // Increased retry interval
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      keepPreviousData: true, // Keep previous data while loading
    }
  );

  // Extract mail items and metadata
  const mailItems = useMemo(() => {
    if (!mailData?.ok) return [];
    return Array.isArray(mailData.items) ? mailData.items : [];
  }, [mailData]);

  const totalItems = mailData?.total || 0;

  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);

        // Try to get user data from localStorage first (from login) for immediate display
        const storedUser = localStorage.getItem('vah_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserProfile(user);
        }

        // Fetch fresh user profile from API
        const token = getToken();
        if (token) {
          const response = await fetch(`${API_BASE}/api/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.data) {
              setUserProfile(data.data);
              // Update localStorage with fresh data
              localStorage.setItem('vah_user', JSON.stringify(data.data));
            }
          } else {
            console.warn('Failed to fetch user profile, using stored data');
          }
        }

      } catch (error) {
        console.error('Error loading user profile:', error);
        // Continue with stored data if API fails
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  // Select/Deselect functions
  const toggleSelectMail = (id: string) => {
    setSelectedMail(prev =>
      prev.includes(id)
        ? prev.filter(mailId => mailId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMail.length === mailItems.length) {
      setSelectedMail([]);
    } else {
      setSelectedMail(mailItems.map((item: MailItem) => String(item.id)));
    }
  };

  const isAllSelected = selectedMail.length === mailItems.length && mailItems.length > 0;
  const isSomeSelected = selectedMail.length > 0;

  // Check if selected items include HMRC or Companies House
  const selectedHasGovernment = selectedMail.some(id => {
    const item = mailItems.find((m: MailItem) => String(m.id) === id);
    return item?.tag === "HMRC" || item?.tag === "COMPANIES HOUSE";
  });

  // Mark mail item as read
  const markAsRead = useCallback(async (item: MailItem) => {
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/mail-items/${item.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_read: true })
      });

      if (res.ok) {
        // Update the SWR cache to reflect the change
        await refreshMail();
      }
    } catch (e) {
      console.error('Error marking item as read:', e);
      // Don't show error to user - this is a background operation
    }
  }, [refreshMail]);

  // Open handler - opens PDF modal, also marks as read
  const onOpen = useCallback(async (item: MailItem) => {
    try {
      setSelectedMailForPDF(item);
      setShowPDFModal(true);

      // Auto-mark as read when opened (if not already read)
      if (!item.is_read) {
        await markAsRead(item);
      }
    } catch (err) {
      console.error('Error opening file:', err);
      toast({
        title: "File Access Error",
        description: "Unable to open file for this item.",
        variant: "destructive",
        durationMs: 4000,
      });
    }
  }, [markAsRead]);


  // Bulk download handler
  const onBulkDownload = useCallback(async () => {
    if (selectedMail.length === 0) return;

    try {
      // Download each selected item
      for (const itemId of selectedMail) {
        const item = mailItems.find((m: MailItem) => String(m.id) === itemId);
        if (item?.scan_url) {
          await downloadFile(`${API_BASE}/api/mail-items/${item.id}/download`, `mail-item-${item.id}.pdf`);
          // Small delay between downloads to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      console.error('Bulk download failed:', err);
      toast({
        title: "Download Warning",
        description: "Some downloads may have failed. Please try again.",
        variant: "destructive",
        durationMs: 5000,
      });
    }
  }, [selectedMail, mailItems]);

  // Generate certificate handler
  const onGenerateCertificate = useCallback(async () => {
    try {
      if (certLoading) return;
      setCertLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/profile/certificate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to generate certificate: ${response.status}`);
      }

      // Get the PDF blob
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `proof-of-address-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Certificate generation failed:', err);
      toast({
        title: "Certificate Generation Failed",
        description: "Failed to generate certificate. Please try again.",
        variant: "destructive",
        durationMs: 5000,
      });
    } finally {
      setCertLoading(false);
    }
  }, [certLoading]);

  // Get user name helper
  const getUserName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    if (userProfile?.email) {
      return userProfile.email.split('@')[0];
    }
    return "User"; // Final fallback
  };

  // Hide noisy provider/system sender labels like "OneDrive Scan"
  const shouldHideSender = (sender?: string) => {
    if (!sender) return false;
    const s = sender.toLowerCase();
    return s.includes('onedrive') || s.includes('one drive') || s.includes('scan');
  };

  // Mock virtual address (you can replace this with real data)
  const virtualAddress = {
    line1: "71-75 Shelton Street",
    line2: "Covent Garden",
    city: "London",
    postcode: "WC2H 9JQ",
    country: "United Kingdom"
  };

  // Check if mail item is GDPR expired (older than 30 days)
  const isGDPRExpired = useCallback((item: MailItem) => {
    // Use backend flag if available
    if (typeof item.gdpr_expired === 'boolean') {
      return item.gdpr_expired;
    }

    // Fallback to frontend calculation using received_at
    if (!item.received_at) return false;

    const receivedDate = new Date(item.received_at);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    return receivedDate < thirtyDaysAgo;
  }, []);

  // Check if mail item can be forwarded
  const canForward = useCallback((item: MailItem) => {
    return !isGDPRExpired(item) && item.status === 'received';
  }, [isGDPRExpired]);

  const handleRequestForwarding = (mailItem?: MailItem) => {
    // If a specific mail item is provided, use it directly
    if (mailItem) {
      if (!canForward(mailItem)) {
        toast({
          title: "Cannot Forward Mail",
          description: isGDPRExpired(mailItem)
            ? "This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it."
            : "This mail item cannot be forwarded at this time.",
          variant: "destructive",
          durationMs: 5000,
        });
        return;
      }
      setSelectedMailForForwarding(mailItem);
      setShowForwardingConfirmation(true);
      return;
    }

    // Otherwise, use bulk selection logic
    if (selectedMail.length === 0) return;

    // Get the first selected mail item for forwarding
    const item = mailItems.find((item: MailItem) => selectedMail.includes(item.id.toString()));
    if (!item) return;

    if (!canForward(item)) {
      toast({
        title: "Cannot Forward Mail",
        description: isGDPRExpired(item)
          ? "This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it."
          : "This mail item cannot be forwarded at this time.",
        variant: "destructive",
        durationMs: 5000,
      });
      return;
    }

    setSelectedMailForForwarding(item);
    setShowForwardingConfirmation(true);
  };

  const handleForwardingConfirm = async (paymentMethod: 'monthly' | 'gocardless') => {
    if (!selectedMailForForwarding) return;

    try {
      const token = getToken();
      const response = await fetch('/api/forwarding/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          mail_item_id: selectedMailForForwarding.id,
          payment_method: paymentMethod,
          // Use the forwarding address from user profile
          forwarding_address: userProfile?.forwarding_address
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          // Show success message
          toast({
            title: "Forwarding Request Created",
            description: "Your request will be reviewed by our team.",
            durationMs: 5000,
          });
          // Clear selection
          setSelectedMail([]);
          // Refresh mail items
          refreshMail();
        } else {
          toast({
            title: "Forwarding Request Failed",
            description: result.error || 'Unknown error',
            variant: "destructive",
            durationMs: 5000,
          });
        }
      } else {
        const errorResult = await response.json().catch(() => ({}));
        const errorMessage = errorResult.message || errorResult.error || "Failed to create forwarding request. Please try again.";

        toast({
          title: "Forwarding Request Failed",
          description: errorMessage,
          variant: "destructive",
          durationMs: 5000,
        });
      }
    } catch (error) {
      console.error('Error creating forwarding request:', error);
      toast({
        title: "Forwarding Request Error",
        description: "Error creating forwarding request. Please try again.",
        variant: "destructive",
        durationMs: 5000,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-background border-b border-border sticky top-0 z-40 shadow-sm" style={{ position: 'relative' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <VAHLogo size="sm" showText={false} />
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center gap-4">
              {/* User Profile */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getUserName()}</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 50 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Support button clicked');
                    onNavigate('contact');
                  }}
                  className="flex items-center gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Support</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Settings button clicked');
                    onNavigate('settings');
                  }}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Account button clicked');
                    onNavigate('account');
                  }}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Account</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Logout button clicked');
                    onLogout();
                  }}
                  className="flex items-center gap-2 text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">

        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-primary">Welcome back, {getUserName()}</h1>
          <p className="text-muted-foreground">Manage your mail and business address</p>
        </div>

        {/* Two Column Layout: Main content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* Left Column - Main Content */}
          <div className="space-y-6">

            {/* Mail Inbox Section */}
            <Card className="shadow-sm">
              <CardHeader className="border-b border-primary/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-semibold">Mail Inbox</CardTitle>
                      <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">{totalItems} items</Badge>
                      {mailLoading && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Click on any mail item to view full details
                    </p>
                  </div>

                  {/* Bulk Actions - Show when items selected */}
                  {isSomeSelected && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="text-sm">
                        {selectedMail.length} selected
                      </Badge>
                      <Button size="sm" variant="outline" onClick={onBulkDownload} disabled={selectedMail.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleRequestForwarding()}
                        disabled={selectedMail.length === 0 || !mailItems.find((item: MailItem) => selectedMail.includes(item.id.toString()) && canForward(item))}
                        title={selectedMail.length === 0 ? "Select mail items to forward" : "Request forwarding for selected items"}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Request Forwarding
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">

                {/* Select All - Desktop */}
                <div className="hidden sm:block px-6 py-3 border-b bg-muted/30">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                    disabled={mailItems.length === 0}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* Select All - Mobile */}
                <div className="sm:hidden px-4 py-3 border-b bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="w-full"
                    disabled={mailItems.length === 0}
                  >
                    {isAllSelected ? (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                        Deselect All ({mailItems.length})
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Select All ({mailItems.length})
                      </>
                    )}
                  </Button>
                </div>

                {/* Error State */}
                {mailError ? (
                  <div className="px-6 py-12 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                    <h3 className="font-medium mb-2">Failed to load mail</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {mailError.message}
                    </p>
                    <Button onClick={() => refreshMail()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                ) : mailItems.length === 0 ? (
                  /* Empty State */
                  <div className="px-6 py-12 text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No mail yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Your mail will appear here when it arrives at your virtual address
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mail Items List - Desktop */}
                    <div className="hidden sm:block">
                      <div className="divide-y">
                        {mailItems.map((item: MailItem) => {
                          const isSelected = selectedMail.includes(String(item.id));
                          const isGovernment = item.tag === "HMRC" || item.tag === "COMPANIES HOUSE";

                          return (
                            <div
                              key={item.id}
                              className={`px-6 py-4 transition-all hover:bg-muted/50 ${isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
                                }`}
                            >
                              <div className="flex items-start gap-4">
                                {/* Checkbox */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectMail(String(item.id));
                                  }}
                                  className="mt-1 flex-shrink-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                                  )}
                                </button>

                                {/* Mail Info - Clickable */}
                                <div
                                  className="flex-1 min-w-0 space-y-2 cursor-pointer group"
                                  onClick={() => onOpen(item)}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                                          Inbox Item
                                        </h4>
                                        {!item.is_read && (
                                          <Badge variant="default" className="text-xs">New</Badge>
                                        )}
                                        {isGovernment && (
                                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                            Free Forwarding
                                          </Badge>
                                        )}
                                        <div className="hidden group-hover:flex items-center gap-1 text-xs text-primary ml-2">
                                          <FileCheck className="h-3 w-3" />
                                          <span className="font-medium">Open</span>
                                        </div>
                                      </div>
                                      {!shouldHideSender(item.sender_name) && (
                                        <p className="text-sm text-muted-foreground truncate group-hover:text-foreground transition-colors">
                                          {item.sender_name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      <p className="text-sm text-muted-foreground">
                                        {item.received_date ? new Date(item.received_date).toLocaleDateString('en-GB', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        }) : 'Unknown Date'}
                                      </p>
                                      {item.tag && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                          {item.tag}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => onOpen(item)}>
                                      <Eye className="h-3 w-3 mr-1" />
                                      Open
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-9"
                                      onClick={() => handleRequestForwarding(item)}
                                      disabled={!canForward(item)}
                                      title={isGDPRExpired(item) ? "Cannot forward: GDPR expired (30+ days old)" : !canForward(item) ? "Cannot forward at this time" : ""}
                                    >
                                      <Truck className="h-3 w-3 mr-1" />
                                      {isGDPRExpired(item) ? "GDPR Expired" : "Forward"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mail Items List - Mobile */}
                    <div className="sm:hidden divide-y">
                      {mailItems.map((item: MailItem) => {
                        const isSelected = selectedMail.includes(String(item.id));
                        const isGovernment = item.tag === "HMRC" || item.tag === "COMPANIES HOUSE";

                        return (
                          <div
                            key={item.id}
                            className={`p-4 ${isSelected ? "bg-primary/5" : ""}`}
                          >
                            <div className="space-y-3">
                              {/* Header with checkbox */}
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectMail(String(item.id));
                                  }}
                                  className="mt-1 flex-shrink-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </button>

                                <div
                                  className="flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity"
                                  onClick={() => onOpen(item)}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium break-words">
                                          Inbox Item
                                        </h4>
                                        {!item.is_read && (
                                          <Badge variant="default" className="text-xs">New</Badge>
                                        )}
                                        {isGovernment && (
                                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                            Free Forwarding
                                          </Badge>
                                        )}
                                      </div>
                                      {!shouldHideSender(item.sender_name) && (
                                        <p className="text-sm text-muted-foreground break-words">
                                          {item.sender_name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      <p className="text-sm text-muted-foreground">
                                        {item.received_date ? new Date(item.received_date).toLocaleDateString('en-GB', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        }) : 'Unknown Date'}
                                      </p>
                                      {item.tag && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                          {item.tag}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>


                                  {/* Actions */}
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => onOpen(item)}>
                                      <Eye className="h-3 w-3 mr-1" />
                                      Open
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-9"
                                      onClick={() => handleRequestForwarding(item)}
                                      disabled={!canForward(item)}
                                      title={isGDPRExpired(item) ? "Cannot forward: GDPR expired (30+ days old)" : !canForward(item) ? "Cannot forward at this time" : ""}
                                    >
                                      <Truck className="h-3 w-3 mr-1" />
                                      {isGDPRExpired(item) ? "GDPR Expired" : "Forward"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Free Forwarding Notice */}

            {/* Bulk Actions Notice - Mobile */}
            {isSomeSelected && (
              <Card className="sm:hidden border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedMail.length} items selected</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedMail([])}>
                      Clear
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button size="default" variant="outline" className="w-full h-10" onClick={onBulkDownload} disabled={selectedMail.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedMail.length})
                    </Button>
                    <Button
                      size="default"
                      variant="default"
                      className="w-full h-10"
                      onClick={() => handleRequestForwarding()}
                      disabled={selectedMail.length === 0 || !mailItems.find((item: MailItem) => selectedMail.includes(item.id.toString()) && canForward(item))}
                      title={selectedMail.length === 0 ? "Select mail items to forward" : "Request forwarding for selected items"}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Request Forwarding
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help Text */}
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Need help? Visit our <button onClick={() => onNavigate('help')} className="text-primary hover:underline">Help Center</button>
              </p>
            </div>
          </div>

          {/* Right Column - Virtual Address Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="border-0">
              <CardHeader className="pb-3 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{userProfile?.company_name || 'Your Virtual Business Address'}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                {/* Address Display */}
                <div className="bg-muted/50 rounded-lg p-2.5 space-y-0.5">
                  <p className="text-xs font-medium">{virtualAddress.line1}</p>
                  <p className="text-xs font-medium">{virtualAddress.line2}</p>
                  <p className="text-xs font-medium">{virtualAddress.city}</p>
                  <p className="text-xs font-medium">{virtualAddress.postcode}</p>
                  <p className="text-xs font-medium">{virtualAddress.country}</p>
                </div>

                {/* Generate Certificate Button */}
                <div className="space-y-1.5">
                  <Button className="w-full" size="sm" onClick={onGenerateCertificate} disabled={certLoading}>
                    {certLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                        Generate Certificate
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center leading-tight">
                    Official proof of address
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>

        </div>
      </main>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        mailItemId={selectedMailForPDF ? parseInt(String(selectedMailForPDF.id)) : null}
        mailItemSubject={selectedMailForPDF?.subject || 'Mail Preview'}
        useBlobFallback
      />

      {/* Forwarding Confirmation Modal */}
      {showForwardingConfirmation && selectedMailForForwarding && (
        <ForwardingConfirmationModal
          isOpen={showForwardingConfirmation}
          onClose={() => {
            setShowForwardingConfirmation(false);
            setSelectedMailForForwarding(null);
          }}
          mailItem={selectedMailForForwarding}
          userProfile={userProfile}
          onConfirm={handleForwardingConfirm}
        />
      )}
    </div>
  );
}